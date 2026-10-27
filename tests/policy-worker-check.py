"""Exercise only the isolated B5 worker; no HTTP availability request triggers release."""
import json,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
compose=['docker','compose','-f','docker-compose.test.yml','-f','docker-compose.policy-test.yml']
def run(args,**kwargs):return subprocess.run(compose+args,cwd=root,check=True,capture_output=True,**kwargs).stdout
def fixture(action,**data):return json.loads(run(['exec','-T','app','php','tests/policy-fixture.php'],input=json.dumps({'action':action,**data}).encode()))
def released(row):
 for _ in range(20):
  state=fixture('status',id=row['id'])
  if state['status']=='no_show':return state
  time.sleep(.5)
 raise AssertionError('Worker did not release overdue absence')
baseline=fixture('counts')['no_show_history']
run(['up','-d','--no-deps','policy-worker'])
first=fixture('overdue');assert released(first)['no_show_history']==baseline+1
print('PASS autonomous worker releases absence without browser/HTTP polling',flush=True)
run(['stop','policy-worker']);second=fixture('overdue');assert fixture('status',id=second['id'])['status']=='confirmed'
run(['start','policy-worker']);assert released(second)['no_show_history']==baseline+2
print('PASS stopped worker catches overdue arrival after restart',flush=True)
run(['restart','policy-worker']);time.sleep(1)
assert fixture('status',id=first['id'])['no_show_history']==baseline+2
print('PASS restart does not duplicate no-show history',flush=True)
