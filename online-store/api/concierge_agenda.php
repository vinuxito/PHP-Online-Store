<?php
/** Public booking API. Identity lookup is intentionally not an authentication mechanism. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
require_once dirname(__DIR__).'/includes/tenant_resolver.php';
require_once dirname(__DIR__,3).'/cfdadmin/lib/quantix_booking.php';
try {
    $tenant=StorefrontTenant::resolve();
    if(!$tenant->isStoreActive || !$tenant->emisorId || empty($tenant->apexConfig['feature_matrix']['royal_agenda']['enabled']))throw new QuantixBookingError('La agenda no está disponible para esta tienda.',403);
    $method=$_SERVER['REQUEST_METHOD']??'GET';
    $action=is_string($_GET['action']??null)?$_GET['action']:'';
    if($action==='quick_scan_keycard')throw new QuantixBookingError('Para consultar una cita utiliza su enlace privado.',410);
    if(!in_array($action,['configuration','availability','submit_appointment_request','get_appointment_status','reschedule','cancel','generate_ics_calendar'],true))throw new QuantixBookingError('Acción no disponible.',404);
    if(!in_array($action,['configuration','availability'],true) && $method!=='POST')throw new QuantixBookingError('Esta operación requiere POST.',405);
    if(!empty($_SERVER['HTTP_ORIGIN'])){
        $origin=parse_url($_SERVER['HTTP_ORIGIN']);
        if(($origin['host']??'')!==preg_replace('/:\d+$/','',$_SERVER['HTTP_HOST']??''))throw new QuantixBookingError('Origen no permitido.',403);
    }
    $raw=file_get_contents('php://input');if(strlen($raw)>12000)throw new QuantixBookingError('El formulario es demasiado largo.',413);
    $data=$raw?json_decode($raw,true):[];if(!is_array($data))throw new QuantixBookingError('Formulario inválido.',422);
    $tz=$tenant->apexConfig['hero_curation']['circadian']['maison_timezone']??'America/Mexico_City';
    $service=new QuantixBooking(get_store_db(),(string)$tenant->emisorId,$tz);
    if($action==='configuration'){
        $settings=$service->settings();$today=(new DateTimeImmutable('now',new DateTimeZone($settings['timezone'])))->format('Y-m-d');
        $out=['settings'=>$settings,'today'=>$today,'brandName'=>$tenant->brandName];
    }elseif($action==='availability'){
        $existing=isset($data['code'])?$service->authorized($data['code'],$data['managementToken']??''):null;
        $out=$service->availability($data['scheduledDate']??($_GET['date']??''),$existing?$existing['DurationMinutes']:null,$existing?$existing['AppointmentCode']:'');
    }
    elseif($action==='submit_appointment_request'){
        // Limit repeated anonymous submissions on this browser session, without storing contact data.
        if(session_status()!==PHP_SESSION_ACTIVE)session_start();
        $bucket='qx_book_'.(string)$tenant->emisorId;$times=$_SESSION[$bucket]??[];
        $times=array_values(array_filter($times,function($t){return $t>time()-600;}));
        if(count($times)>=12)throw new QuantixBookingError('Has enviado varias solicitudes. Espera unos minutos antes de reintentar.',429);
        $times[]=time();$_SESSION[$bucket]=$times;session_write_close();
        $out=['appointment'=>$service->create($data),'message'=>'Cita registrada. Guarda tu enlace privado para consultar su estado.'];
    }else{
        $row=$service->authorized($data['code']??'',$data['managementToken']??'');
        if($action==='generate_ics_calendar'){
            header('Content-Type: text/calendar; charset=utf-8');header('Content-Disposition: attachment; filename="Cita.ics"');echo QuantixBooking::ics($row,$tenant->brandName);exit;
        }
        $out=['appointment'=>$action==='get_appointment_status'?$service->view($row):$service->change($row['AppointmentCode'],array_merge($data,['operation'=>$action]),false,$data['managementToken'])];
    }
    // Meeting access is returned only with an authorized confirmed appointment.
    if(isset($out['settings']))unset($out['settings']['meetingUrl']);
    echo json_encode(array_merge(['Status'=>'OK'],$out),JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
}catch(QuantixBookingError $e){http_response_code($e->getCode());echo json_encode(['Status'=>'ERROR','Error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
catch(Throwable $e){http_response_code(503);echo json_encode(['Status'=>'ERROR','Error'=>'No se pudo completar la operación. Conservamos tus datos en el formulario; puedes reintentar.']);}
