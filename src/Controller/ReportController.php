<?php
declare(strict_types=1);
namespace App\Controller;
use App\Core\{Database,Request,Response,StaffSession};
use App\Domain\BookingError;
use App\Service\{BookingClock,DailyReportService};
use PDO;
final class ReportController
{
    private PDO $pdo;
    private BookingClock $clock;
    public function __construct(){$this->pdo=Database::connect(require dirname(__DIR__,2).'/config/database.php');$this->clock=new BookingClock($this->pdo);}
    public function page(Request $r):Response
    {
        try{$this->report($this->clock->now()->format('Y-m-d'));}
        catch(BookingError $e){return $e->httpStatus===401?new Response('',303,'text/html',['Location'=>'/staff/login']):new Response($e->getMessage(),$e->httpStatus,'text/plain');}
        $root=dirname(__DIR__,2);$html=file_get_contents(dirname(__DIR__).'/View/reports.php');
        foreach(['version'=>'public/assets/js/reports.js','css_version'=>'public/assets/css/reports.css'] as $name=>$file)$html=str_replace('{{'.$name.'}}',substr(hash_file('sha256',$root.'/'.$file),0,12),$html);
        return new Response($html);
    }
    public function daily(Request $r):Response
    {
        try{
            $date=$r->query['date']??$this->clock->now()->format('Y-m-d');
            if(!is_string($date))throw new BookingError('invalid_date','Choose a valid Manila report date.');
            return Response::json(['ok'=>true,'report'=>$this->report($date)]);
        }catch(BookingError $e){return Response::json(['ok'=>false,'error'=>['code'=>$e->errorCode,'message'=>$e->getMessage()]],$e->httpStatus);}
    }
    private function report(string $date):array{return (new DailyReportService($this->pdo,$this->clock))->daily(StaffSession::open($this->pdo)->requireActor(),$date);}
}
