"""Rebuild/restore ONLY the dedicated isolated MySQL test schema. Never uses main Compose."""
from pathlib import Path
import json,subprocess,sys,tempfile

ROOT=Path(__file__).resolve().parents[1]
COMPOSE=['docker','compose','-f','docker-compose.test.yml']
OFFLINE=False
def run(args,**kwargs):
    return subprocess.run(COMPOSE+args,cwd=ROOT,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,**kwargs).stdout
def app(code):
    args=['run','--rm','--no-deps','-T','app','php'] if OFFLINE else ['exec','-T','app','php']
    return run(args,input=code.encode())
def guard():
    result=app("<?php require 'src/autoload.php';$c=require 'config/database.php';if(getenv('BOOKING_TEST_MODE')!=='isolated'||$c['database']!=='tablebook_p3_test')exit(9);echo 'isolated';")
    if result!=b'isolated':raise RuntimeError('Isolated guard failed')
def mysql(sql):
    return run(['exec','-T','db','sh','-c','exec env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --binary-mode=1'],input=sql)
def dump():
    return run(['exec','-T','db','sh','-c','exec env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces --skip-comments --set-gtid-purged=OFF tablebook_p3_test'])
def fingerprint():
    return json.loads(app("""<?php require 'src/autoload.php';$p=App\\Core\\Database::connect(require 'config/database.php');$out=[];$p->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');foreach($p->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t){$r=$p->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC);$r=array_map(fn($x)=>json_encode($x,JSON_THROW_ON_ERROR),$r);sort($r,SORT_STRING);$out[$t]=['count'=>count($r),'hash'=>hash('sha256',implode("\\n",$r))];}$p->rollBack();echo json_encode($out,JSON_THROW_ON_ERROR);"""))
def restore(data):
    mysql(b'DROP DATABASE IF EXISTS tablebook_p3_test; CREATE DATABASE tablebook_p3_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    mysql(b'USE tablebook_p3_test;\n'+data)

def worker(args):
    return subprocess.run(COMPOSE+['-f','docker-compose.policy-test.yml']+args,cwd=ROOT,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout

def main():
    global OFFLINE
    if len(sys.argv)!=2 or sys.argv[1] not in ['fresh','restore']:raise SystemExit('Usage: python3 scripts/rehearse_bella_vista_test.py fresh|restore')
    guard()
    # Run only when no separate CLI suite owns this dedicated test schema.
    # Stop the isolated HTTP writer before taking either the dump or the comparison snapshot.
    worker_id=worker(['ps','-a','-q','policy-worker']).decode().strip() if (ROOT/'docker-compose.policy-test.yml').exists() else ''
    worker_state=subprocess.run(['docker','inspect','--format','{{.State.Status}}',worker_id],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout.decode().strip() if worker_id else 'absent'
    if worker_state=='paused':raise RuntimeError('Resume or stop the paused isolated policy worker before recovery; no writers or data were changed.')
    worker_running=worker_state in ('running','restarting')
    if worker_running:worker(['stop','policy-worker'])
    run(['stop','app']);OFFLINE=True
    try:
        backup=dump();folder=Path(tempfile.mkdtemp(prefix='bella-vista-test-'));folder.chmod(0o700)
        saved=folder/'isolated.sql';saved.write_bytes(backup);saved.chmod(0o600)
        if sys.argv[1]=='fresh':
            try:
                mysql(b'DROP DATABASE tablebook_p3_test; CREATE DATABASE tablebook_p3_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
                output=run(['run','--rm','--no-deps','-T','app','php','bin/setup-test-db.php'])
                print(output.decode().strip())
                print('Fresh legacy test schema ready. Private isolated recovery dump: '+str(saved))
            except BaseException:
                restore(backup)
                raise
        else:
            before=fingerprint()
            restore(backup)
            after=fingerprint()
            if before!=after:raise RuntimeError('Restored test database differs; retained private recovery dump: '+str(saved))
            print('PASS real isolated dump/drop/restore; all '+str(len(before))+' table content hashes and counts match. Private backup: '+str(saved))
    finally:
        run(['start','app']);OFFLINE=False
        if worker_running:
            worker(['start','policy-worker'])
if __name__=='__main__':main()
