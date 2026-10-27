<?php
declare(strict_types=1);
namespace App\Controller;
use App\Core\{Database,Request,Response,StaffSession};
use App\Service\{BillingService,BookingClock};
use App\Domain\BookingError;
use PDO;

final class BillingController
{
    private PDO $pdo;
    private BillingService $service;
    public function __construct(){ $this->pdo=Database::connect(require dirname(__DIR__,2).'/config/database.php');$this->service=new BillingService($this->pdo,new BookingClock($this->pdo)); }
    public function page(Request $r):Response
    {
        try{$this->service->listing(StaffSession::open($this->pdo)->requireActor(),(new BookingClock($this->pdo))->now()->format('Y-m-d'));}
        catch(BookingError $e){return $e->httpStatus===401?new Response('',303,'text/html',['Location'=>'/staff/login']):new Response($e->getMessage(),$e->httpStatus,'text/plain');}
        $html=file_get_contents(dirname(__DIR__).'/View/billing.php');
        $version=substr(hash_file('sha256',dirname(__DIR__,2).'/public/assets/js/billing.js'),0,12);
        return new Response(str_replace('{{version}}',$version,$html));
    }
    public function listing(Request $r):Response
    {
        return $this->respond(function()use($r){$actor=StaffSession::open($this->pdo)->requireActor();$date=$r->query['date']??(new BookingClock($this->pdo))->now()->format('Y-m-d');$d=is_string($date)?\DateTimeImmutable::createFromFormat('!Y-m-d',$date):false;if(!$d||$d->format('Y-m-d')!==$date)throw new BookingError('invalid_date','Choose a valid service date.');return ['reservations'=>$this->service->listing($actor,$date)];});
    }
    public function quote(Request $r):Response
    {
        return $this->respond(fn()=>['bill'=>$this->service->quote(StaffSession::open($this->pdo)->requireActor(),$this->id($r->query['reservation_id']??null))]);
    }
    public function mutate(Request $r):Response
    {
        return $this->respond(function()use($r){$session=StaffSession::open($this->pdo);$actor=$session->requireActor();$session->csrf($r);
            if(strtolower(trim(explode(';',$r->header('Content-Type'),2)[0]))!=='application/json')throw new BookingError('unsupported_content_type','Send application/json.',415);
            $d=$r->json();if(array_diff(array_keys($d),['reservation_id','action','revision','request_key','data'])!==[]||!is_string($d['action']??null)||!is_string($d['revision']??null)||!is_string($d['request_key']??null)||!is_array($d['data']??null))throw new BookingError('invalid_request','Check the bill action.');
            return $this->service->mutate($actor,$this->id($d['reservation_id']??null),$d['action'],$d['revision'],$d['request_key'],$d['data']);});
    }
    private function id(mixed $v):int
    {
        if((!is_int($v)&&(!is_string($v)||!ctype_digit($v)))||(float)$v>PHP_INT_MAX||(int)$v<1)throw new BookingError('invalid_request','Choose a valid reservation.');return (int)$v;
    }
    private function respond(\Closure $fn):Response
    {
        try{return Response::json(['ok'=>true]+$fn());}catch(BookingError $e){return Response::json(['ok'=>false,'error'=>['code'=>$e->errorCode,'message'=>$e->getMessage()]],$e->httpStatus);}
    }
}
