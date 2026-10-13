<?php
/** Public shopper capabilities and durable selections; unrelated to merchant agent APIs. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
require_once dirname(__DIR__) . '/includes/shopper_workspace.php';

function qxShopperSameOrigin() {
    $origin=$_SERVER['HTTP_ORIGIN']??'';
    $scheme=!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http';
    $expected=$scheme.'://'.($_SERVER['HTTP_HOST']??'');
    if (($origin!=='' && !hash_equals(strtolower($expected),strtolower($origin))) || ($origin==='' && ($_SERVER['HTTP_SEC_FETCH_SITE']??'')!=='same-origin'))
        throw new QuantixShopperError(403,'ORIGIN_REQUIRED','Abre la selección desde esta tienda.','open_storefront');
}
function qxShopperOutput($value) { echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE); }
try {
    $method=$_SERVER['REQUEST_METHOD']??'';
    if (!in_array($method,['GET','POST'],true)) throw new QuantixShopperError(405,'METHOD_NOT_ALLOWED','Usa GET para consultar y POST para guardar.','discover_capabilities');
    $data=[];
    if ($method==='POST') {
        if ((int)($_SERVER['CONTENT_LENGTH']??0)>32768) throw new QuantixShopperError(413,'BODY_LIMIT','La selección supera el tamaño permitido.','reduce_selection');
        if (strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]))!=='application/json') throw new QuantixShopperError(415,'JSON_REQUIRED','Envía la selección como JSON.','correct_input');
        $stream=fopen('php://input','rb'); $raw=stream_get_contents($stream,32769); fclose($stream);
        if(strlen($raw)>32768) throw new QuantixShopperError(413,'BODY_LIMIT','La selección supera el tamaño permitido.','reduce_selection');
        $data=json_decode($raw,true);
        if (!is_array($data)) throw new QuantixShopperError(400,'INVALID_JSON','La selección no contiene JSON válido.','correct_input');
    }
    $action=$data['action']??($_GET['action']??'read');
    if (!is_string($action)) throw new QuantixShopperError(400,'UNKNOWN_ACTION','Esta acción no está disponible.','discover_capabilities');
    if ($action==='discover' && $method==='GET') { qxShopperOutput(QuantixShopperWorkspace::discovery()); exit; }
    if ($method==='GET' && !in_array($action,['read','quote','recommend'],true)) throw new QuantixShopperError(405,'POST_REQUIRED','Esta acción requiere POST.','correct_method');
    if ($method==='POST' && in_array($action,['create','claim'],true)) qxShopperSameOrigin();
    $tenant=StorefrontTenant::resolve($data);
    if (!$tenant->isStoreActive || !$tenant->emisorId) throw new QuantixShopperError(404,'STORE_UNAVAILABLE',$tenant->resolutionError?:'La tienda no está disponible.','open_storefront');
    QuantixShopperWorkspace::startSession();
    $workspace=new QuantixShopperWorkspace(get_store_db(),$tenant);
    if(random_int(1,50)===1)$workspace->prune();
    $authorization=QuantixShopperWorkspace::authorization();
    if ($action==='create' || $action==='claim') {
        if ($authorization!=='') throw new QuantixShopperError(403,'OWNER_REQUIRED','Esta acción necesita una sesión de comprador.','open_storefront');
        $result=$action==='create'?$workspace->create($data):$workspace->claim($data);
    } elseif (in_array($action,['read','quote','recommend'],true)) {
        $id=$data['workspace_id']??($_GET['workspace_id']??$workspace->currentId());
        $workspace->authenticate($id,$authorization,false); $result=$action==='recommend'?$workspace->recommend($id):$workspace->read($id);
    } elseif(in_array($action,['update','grant','revoke','handoff'],true) && $method==='POST') {
        $data['_csrf']=$_SERVER['HTTP_X_QX_CSRF']??'';
        $result=$workspace->mutate($action,$data,$authorization);
    } else throw new QuantixShopperError(400,'UNKNOWN_ACTION','Esta acción no está disponible.','discover_capabilities');
    qxShopperOutput($result);
} catch (QuantixShopperError $e) {
    http_response_code($e->statusCode);
    qxShopperOutput(array_merge(['Status'=>'Error','code'=>$e->machineCode,'Error'=>$e->getMessage(),'recovery'=>$e->recovery],$e->details));
} catch (Throwable $e) {
    // Never disclose customer state, bearer credentials or database details.
    http_response_code(503);
    qxShopperOutput(['Status'=>'Error','code'=>'WORKSPACE_UNAVAILABLE','Error'=>'No pudimos confirmar el guardado. Conserva tu selección y reintenta el mismo intento.','recovery'=>'retry_same_operation']);
}
