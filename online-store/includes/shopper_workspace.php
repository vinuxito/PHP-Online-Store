<?php
/** Durable buyer workspace. Capabilities never grant merchant, payment or fiscal authority. */
require_once __DIR__ . '/tenant_resolver.php';
require_once __DIR__ . '/pending_order_contract.php';
require_once __DIR__ . '/recommendation_contract.php';
require_once dirname(__DIR__, 3) . '/cfdadmin/lib/QuantixProductFacts.php';

class QuantixShopperError extends RuntimeException {
    public $statusCode; public $machineCode; public $recovery; public $details;
    public function __construct($status, $code, $message, $recovery = 'read_current_state', array $details = []) {
        parent::__construct($message); $this->statusCode = $status; $this->machineCode = $code;
        $this->recovery = $recovery; $this->details = $details;
    }
}

class QuantixShopperContract {
    public static function identifier($value, $operation = false) {
        if (!is_string($value) || !preg_match($operation ? '/^[a-zA-Z0-9_-]{16,64}$/D' : '/^[a-zA-Z0-9_-]{1,80}$/D', $value))
            throw new QuantixShopperError(422, 'INVALID_IDENTIFIER', 'El identificador no es válido.', 'correct_input');
        return $value;
    }
    public static function text($value, $limit) {
        if (!is_string($value) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value) || preg_match('//u', $value) !== 1 || preg_match_all('/./us', $value, $unused) > $limit)
            throw new QuantixShopperError(422, 'INVALID_INTENT', 'Describe tu búsqueda con texto válido y breve.', 'correct_input');
        return trim($value);
    }
    public static function state(array $previous, $patch) {
        if (!is_array($patch) || array_diff(array_keys($patch), ['intent','shortlist','cart']))
            throw new QuantixShopperError(422, 'INVALID_STATE', 'La selección contiene campos no permitidos.', 'correct_input');
        $state = $previous;
        if (array_key_exists('intent', $patch)) {
            $intent = $patch['intent'];
            if (!is_array($intent) || array_diff(array_keys($intent), ['query','budget'])) throw new QuantixShopperError(422, 'INVALID_INTENT', 'La intención contiene campos no permitidos.', 'correct_input');
            $state['intent'] = $state['intent'] ?? ['query'=>'','budget'=>null];
            if (array_key_exists('query', $intent)) $state['intent']['query'] = self::text($intent['query'], 600);
            if (array_key_exists('budget', $intent)) {
                $budget = $intent['budget'];
                if ($budget !== null && ((!is_int($budget) && !is_float($budget)) || !is_finite((float)$budget) || $budget < 0.01 || $budget > 100000000 || abs(round($budget,2)-$budget)>0.000001))
                    throw new QuantixShopperError(422, 'INVALID_BUDGET', 'Usa un presupuesto positivo válido.', 'correct_input');
                $state['intent']['budget'] = $budget === null ? null : round($budget, 2);
            }
        }
        if (array_key_exists('shortlist', $patch)) {
            if (!is_array($patch['shortlist']) || count($patch['shortlist']) > 4) throw new QuantixShopperError(422, 'SHORTLIST_LIMIT', 'Puedes comparar hasta cuatro opciones.', 'correct_input');
            $state['shortlist'] = [];
            foreach ($patch['shortlist'] as $id) $state['shortlist'][] = self::identifier($id);
            $state['shortlist'] = array_values(array_unique($state['shortlist']));
        }
        if (array_key_exists('cart', $patch)) {
            if (!is_array($patch['cart']) || !isset($patch['cart']['items']) || !is_array($patch['cart']['items']) || count($patch['cart']['items']) > 100 || array_diff(array_keys($patch['cart']), ['items']))
                throw new QuantixShopperError(422, 'INVALID_CART', 'La selección debe contener hasta cien productos.', 'correct_input');
            $state['cart'] = ['items'=>[]];
            foreach ($patch['cart']['items'] as $item) {
                if (!is_array($item)) throw new QuantixShopperError(422, 'INVALID_CART', 'Producto inválido.', 'correct_input');
                $accepted=['id','baseId','accentId','qty','quantity','isDecant','isSubscription','isDuoPack','isGift','customFinish','priceWithTax','code','sku','name','thumb','thumbAccent','unitPrice','vatRate','iepsRate','frequencyMonths','discountPct','bundleDiscountPercent','format'];
                if(array_diff(array_keys($item),$accepted)) throw new QuantixShopperError(422,'INVALID_CART_FIELD','La selección contiene campos ajenos al catálogo.','correct_input');
                $id = self::identifier($item['id'] ?? null);
                $qty = $item['qty'] ?? ($item['quantity'] ?? null);
                if (!is_int($qty) || $qty < 1 || $qty > 999) throw new QuantixShopperError(422, 'INVALID_QUANTITY', 'La cantidad debe ser un entero entre 1 y 999.', 'correct_input');
                $line = ['id'=>$id,'qty'=>$qty,'quantity'=>$qty];
                foreach (['isDecant','isSubscription','isDuoPack','isGift'] as $flag) {
                    if (isset($item[$flag]) && !is_bool($item[$flag])) throw new QuantixShopperError(422, 'INVALID_VARIANT', 'La variante no es válida.', 'correct_input');
                    $line[$flag] = !empty($item[$flag]);
                }
                foreach(['baseId','accentId'] as $identity) if(isset($item[$identity]))$line[$identity]=self::identifier($item[$identity]);
                $finish = $item['customFinish'] ?? '';
                if(is_array($finish)){
                    if(array_diff(array_keys($finish),['id','name','priceDelta']))throw new QuantixShopperError(422,'INVALID_VARIANT','El acabado contiene campos no permitidos.','correct_input');
                    $line['customFinish']=['id'=>self::identifier($finish['id']??null),'name'=>self::text($finish['name']??'',100)];
                    if(isset($finish['priceDelta'])){if(!is_numeric($finish['priceDelta'])||!is_finite((float)$finish['priceDelta'])||abs((float)$finish['priceDelta'])>100000000)throw new QuantixShopperError(422,'INVALID_VARIANT','El ajuste de precio no es válido.','correct_input');$line['customFinish']['priceDelta']=(float)$finish['priceDelta'];}
                }else $line['customFinish'] = $finish === null || $finish === false ? '' : self::text($finish, 80);
                foreach(['frequencyMonths','discountPct','bundleDiscountPercent'] as $variant)if(isset($item[$variant])){if(!is_numeric($item[$variant])||!is_finite((float)$item[$variant])||$item[$variant]<0||$item[$variant]>100)throw new QuantixShopperError(422,'INVALID_VARIANT','La variante no es válida.','correct_input');$line[$variant]=0+$item[$variant];}
                if (array_key_exists('priceWithTax', $item)) {
                    if ((!is_int($item['priceWithTax']) && !is_float($item['priceWithTax'])) || !is_finite((float)$item['priceWithTax']) || $item['priceWithTax'] < 0)
                        throw new QuantixShopperError(422, 'INVALID_DISPLAY_PRICE', 'El precio mostrado no es válido.', 'correct_input');
                    $line['priceWithTax'] = round($item['priceWithTax'], 2);
                }
                $state['cart']['items'][] = $line;
            }
        }
        return $state;
    }
    /** Safe ordered identity shared by reviewed carts and immutable registration lines. */
    public static function cartIdentity(array $items) {
        if(count($items)>100)throw new QuantixShopperError(422,'INVALID_CART','La selección debe contener hasta cien productos.','correct_input');
        $identity=[];
        foreach($items as $item){
            if(!is_array($item))throw new QuantixShopperError(422,'INVALID_CART','Producto inválido.','correct_input');
            $id=self::identifier($item['id']??null);
            $qty=$item['qty']??($item['quantity']??null);
            if(!is_int($qty)||$qty<1||$qty>999)throw new QuantixShopperError(422,'INVALID_QUANTITY','La cantidad debe ser un entero entre 1 y 999.','correct_input');
            // Server registration lines keep the base ID and format; browser carts keep the complete variant ID.
            $registration=array_key_exists('format',$item) && !array_key_exists('isDecant',$item);
            if($registration && !in_array($item['format'],['full','decant'],true))throw new QuantixShopperError(422,'INVALID_VARIANT','La variante no es válida.','correct_input');
            $decant=$registration?$item['format']==='decant':!empty($item['isDecant']);
            if($registration && $decant)$id.='__decant';
            $finish=$item['customFinish']??'';
            if(!$finish)$finish='';
            elseif(is_array($finish)){
                // Identity includes only the selected finish ID, never free text or proposed prices.
                $finish=['id'=>self::identifier($finish['id']??null)];
            }else $finish=self::text($finish,80);
            $identity[]=[$id,$qty,$decant,!empty($item['isSubscription']),!empty($item['isDuoPack']),!empty($item['isGift']),$finish];
        }
        usort($identity,function($a,$b){return strcmp(json_encode($a),json_encode($b));});
        return $identity;
    }
    public static function initial() { return ['intent'=>['query'=>'','budget'=>null],'shortlist'=>[],'cart'=>['items'=>[]]]; }
    public static function scopes($value) {
        if (!is_array($value) || !$value || count($value) > 2 || array_diff($value, ['read','write']) || !in_array('read', $value, true))
            throw new QuantixShopperError(422, 'INVALID_SCOPE', 'El acceso debe permitir lectura y, opcionalmente, editar la selección.', 'correct_input');
        return array_values(array_unique($value));
    }
}

class QuantixShopperWorkspace {
    private $db; private $tenant; private $actor = 'owner'; private $grant = null; private static $ownerToken = '';
    public static function authorization() {
        $values=[];foreach(['HTTP_AUTHORIZATION','REDIRECT_HTTP_AUTHORIZATION'] as $key)if(isset($_SERVER[$key]) && $_SERVER[$key]!=='')$values[]=$_SERVER[$key];
        if(function_exists('getallheaders')){foreach(getallheaders() as $key=>$value)if(strcasecmp($key,'Authorization')===0 && $value!=='')$values[]=$value;}
        foreach($values as $value)if(!is_string($value))throw new QuantixShopperError(401,'INVALID_CAPABILITY','El acceso no es válido.','request_new_grant');
        $values=array_values(array_unique($values));
        if(count($values)>1)throw new QuantixShopperError(401,'AMBIGUOUS_AUTHORIZATION','El acceso contiene credenciales incompatibles.','request_new_grant');
        return $values[0]??'';
    }
    private static function initializeOwnerCookie() {
        $token=$_COOKIE['QX_BUYER']??'';
        if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token))$token=bin2hex(random_bytes(32));
        self::$ownerToken=$token;
        setcookie('QX_BUYER',$token,['expires'=>time()+604800,'path'=>'/','secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Lax']);
        $_COOKIE['QX_BUYER']=$token;
    }
    private function ownerHash(){return hash('sha256',self::$ownerToken);}
    private function attachOwner($id){
        $this->query('INSERT INTO quantix_shopper_owners (EmisorID,WorkspaceID,OwnerHash,ExpiresAt,UpdatedAt) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE ExpiresAt=VALUES(ExpiresAt),UpdatedAt=NOW()',[$this->tenant->emisorId,$id,$this->ownerHash(),time()+604800]);
        $_SESSION['qx_shopper_owners'][$this->tenant->emisorId][$id]=true;$_SESSION['qx_shopper_active'][$this->tenant->emisorId]=$id;
    }
    public static function startSession() {
        self::initializeOwnerCookie();
        if (session_status() === PHP_SESSION_ACTIVE && session_name()==='QX_SHOPPER') return;
        if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); session_id(''); $_SESSION=[]; }
        session_name('QX_SHOPPER');
        session_set_cookie_params(['lifetime'=>604800,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Lax']);
        ini_set('session.use_strict_mode', '1'); ini_set('session.gc_maxlifetime','604800'); session_start();
        if (empty($_SESSION['qx_shopper_csrf'])) $_SESSION['qx_shopper_csrf'] = bin2hex(random_bytes(24));
    }
    public function __construct(PDO $db, StorefrontTenant $tenant) { $this->db=$db; $this->tenant=$tenant; $this->setup(); }
    public function csrf() { return $_SESSION['qx_shopper_csrf'] ?? ''; }
    private function setup() {
        // Additive, isolated tables; no product, stock, order or invoice schema changes.
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_workspaces (EmisorID VARCHAR(80) NOT NULL, WorkspaceID CHAR(32) NOT NULL, Revision INT UNSIGNED NOT NULL DEFAULT 0, ExpiresAt BIGINT UNSIGNED NOT NULL, StateJSON MEDIUMTEXT NOT NULL, CreatedAt DATETIME NOT NULL, UpdatedAt DATETIME NOT NULL, PRIMARY KEY (EmisorID,WorkspaceID), INDEX (UpdatedAt)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_receipts (EmisorID VARCHAR(80) NOT NULL, WorkspaceID CHAR(32) NOT NULL, OperationID VARCHAR(64) NOT NULL, ReceiptRevision INT UNSIGNED NOT NULL, RequestHash CHAR(64) NOT NULL, ResponseJSON MEDIUMTEXT NOT NULL, CreatedAt DATETIME NOT NULL, PRIMARY KEY (EmisorID,WorkspaceID,OperationID), INDEX (CreatedAt)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_grants (EmisorID VARCHAR(80) NOT NULL, WorkspaceID CHAR(32) NOT NULL, GrantID CHAR(32) NOT NULL, TokenHash CHAR(64) NOT NULL, ScopeJSON VARCHAR(80) NOT NULL, BudgetCeiling DECIMAL(12,2) NULL, Kind VARCHAR(12) NOT NULL, ExpiresAt BIGINT UNSIGNED NOT NULL, RevokedAt BIGINT UNSIGNED NULL, ConsumedAt BIGINT UNSIGNED NULL, CreatedAt DATETIME NOT NULL, PRIMARY KEY (EmisorID,GrantID), UNIQUE KEY (TokenHash), INDEX (EmisorID,WorkspaceID)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_limits (BucketHash CHAR(64) NOT NULL, WindowStart BIGINT UNSIGNED NOT NULL, Hits INT UNSIGNED NOT NULL, PRIMARY KEY (BucketHash,WindowStart)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_orders (SequenceID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,EmisorID VARCHAR(80) NOT NULL, WorkspaceID CHAR(32) NOT NULL, OrderID CHAR(32) NOT NULL, CreatedAt DATETIME NOT NULL, PRIMARY KEY (EmisorID,WorkspaceID,OrderID), UNIQUE KEY uq_shopper_sequence (SequenceID),UNIQUE KEY uq_shopper_order (EmisorID,OrderID)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->exec("CREATE TABLE IF NOT EXISTS quantix_shopper_owners (EmisorID VARCHAR(80) NOT NULL,WorkspaceID CHAR(32) NOT NULL,OwnerHash CHAR(64) NOT NULL,ExpiresAt BIGINT UNSIGNED NOT NULL,UpdatedAt DATETIME NOT NULL,PRIMARY KEY (EmisorID,WorkspaceID,OwnerHash),INDEX (OwnerHash,ExpiresAt)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $unique=$this->query('SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND NON_UNIQUE=0 AND INDEX_NAME=?',['quantix_shopper_orders','uq_shopper_order'])->fetchColumn();
        if(!$unique){try{$this->db->exec('ALTER TABLE quantix_shopper_orders ADD UNIQUE KEY uq_shopper_order (EmisorID,OrderID)');}catch(PDOException $e){if(($e->errorInfo[1]??0)!==1061)throw $e;}}
        // Upgrade early workspace schema revisions additively; safe during rolling served QA.
        foreach([['quantix_shopper_workspaces','ExpiresAt','BIGINT UNSIGNED NOT NULL DEFAULT '.(time()+604800)],['quantix_shopper_receipts','ReceiptRevision','INT UNSIGNED NOT NULL DEFAULT 0'],['quantix_shopper_grants','BudgetCeiling','DECIMAL(12,2) NULL'],['quantix_shopper_orders','SequenceID','BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE']] as $column){
            $exists=$this->query('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[$column[0],$column[1]])->fetchColumn();
            if(!$exists){try{$this->db->exec('ALTER TABLE '.$column[0].' ADD COLUMN '.$column[1].' '.$column[2]);}catch(PDOException $e){if(($e->errorInfo[1]??0)!==1060)throw $e;}}
        }
    }
    private function rate($bucket,$seconds,$limit) {
        $window=(int)(floor(time()/$seconds)*$seconds); $hash=hash('sha256','quantix-shopper|'.$bucket);
        $this->query('INSERT INTO quantix_shopper_limits (BucketHash,WindowStart,Hits) VALUES (?,?,1) ON DUPLICATE KEY UPDATE Hits=Hits+1',[$hash,$window]);
        $hits=$this->query('SELECT Hits FROM quantix_shopper_limits WHERE BucketHash=? AND WindowStart=?',[$hash,$window])->fetchColumn();
        if((int)$hits>$limit) throw new QuantixShopperError(429,'RATE_LIMIT','Espera un momento antes de intentarlo de nuevo.','retry_after_wait');
    }
    public function prune() {
        // Bounded maintenance without touching pending orders; only expired shopper capabilities/state.
        $this->query('DELETE FROM quantix_shopper_owners WHERE ExpiresAt<? LIMIT 100',[time()-86400]);
        $this->query('DELETE FROM quantix_shopper_limits WHERE WindowStart<? LIMIT 500',[time()-7200]);
        $this->query('DELETE FROM quantix_shopper_grants WHERE ExpiresAt<? LIMIT 100',[time()-86400]);
        $this->query('DELETE FROM quantix_shopper_receipts WHERE CreatedAt<DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 500',[]);
        $expired=$this->query('SELECT EmisorID,WorkspaceID FROM quantix_shopper_workspaces WHERE ExpiresAt<? LIMIT 10',[time()-86400])->fetchAll();
        foreach($expired as $row){foreach(['quantix_shopper_receipts','quantix_shopper_grants','quantix_shopper_orders','quantix_shopper_owners','quantix_shopper_workspaces'] as $table)$this->query('DELETE FROM '.$table.' WHERE EmisorID=? AND WorkspaceID=?',[$row['EmisorID'],$row['WorkspaceID']]);}
    }
    private function query($sql, array $args) { $q=$this->db->prepare($sql); $q->execute($args); return $q; }
    private function json($value) { return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR); }
    private function ownerIds() { return $_SESSION['qx_shopper_owners'][$this->tenant->emisorId] ?? []; }
    public function currentId() {
        $active=$_SESSION['qx_shopper_active'][$this->tenant->emisorId]??''; if($active)return $active;
        return $this->query('SELECT WorkspaceID FROM quantix_shopper_owners WHERE EmisorID=? AND OwnerHash=? AND ExpiresAt>? ORDER BY UpdatedAt DESC LIMIT 1',[$this->tenant->emisorId,$this->ownerHash(),time()])->fetchColumn()?:'';
    }
    private function isOwner($id){return (bool)$this->query('SELECT WorkspaceID FROM quantix_shopper_owners WHERE EmisorID=? AND WorkspaceID=? AND OwnerHash=? AND ExpiresAt>?',[$this->tenant->emisorId,$id,$this->ownerHash(),time()])->fetchColumn();}
    public function ownedWorkspace($id) {
        if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id) || !$this->isOwner($id) || self::authorization()!=='')
            throw new QuantixShopperError(403, 'OWNER_REQUIRED', 'Este acceso necesita la sesión que creó la selección.', 'request_handoff');
        $row=$this->query('SELECT * FROM quantix_shopper_workspaces WHERE EmisorID=? AND WorkspaceID=?',[$this->tenant->emisorId,$id])->fetch();
        if (!$row) throw new QuantixShopperError(404, 'WORKSPACE_NOT_FOUND', 'La selección no está disponible.', 'create_workspace');
        if((int)$row['ExpiresAt']<=time()) throw new QuantixShopperError(410,'WORKSPACE_EXPIRED','La selección venció después de siete días sin cambios.','create_workspace');
        $this->attachOwner($id);
        return $row;
    }
    public function authenticate($id, $authorization, $write = false) {
        if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id)) throw new QuantixShopperError(403, 'ACCESS_REQUIRED', 'Abre tu selección o usa un acceso vigente.', 'request_handoff');
        if ($authorization !== '') {
            if (!preg_match('/^Bearer ([a-f0-9]{64})$/D', $authorization, $match)) throw new QuantixShopperError(401, 'INVALID_CAPABILITY', 'El acceso del agente no es válido.', 'request_new_grant');
            $row=$this->query('SELECT * FROM quantix_shopper_grants WHERE TokenHash=? AND EmisorID=? AND WorkspaceID=? AND Kind=\'grant\' FOR UPDATE', [hash('sha256',$match[1]),$this->tenant->emisorId,$id])->fetch();
            if (!$row || $row['RevokedAt'] !== null || $row['ConsumedAt'] !== null || (int)$row['ExpiresAt'] <= time()) throw new QuantixShopperError(401, 'CAPABILITY_EXPIRED', 'El acceso expiró o fue revocado.', 'request_new_grant');
            $scopes=json_decode($row['ScopeJSON'],true);
            if ($write && !in_array('write',$scopes,true)) throw new QuantixShopperError(403,'SCOPE_DENIED','Este acceso permite consultar, pero no editar la selección.','request_write_grant');
            $this->actor='agent'; $this->grant=$row;
            return;
        }
        $this->ownedWorkspace($id); $this->actor='owner';
    }
    public function requireOwner() {
        if ($this->actor !== 'owner') throw new QuantixShopperError(403,'OWNER_REQUIRED','Sólo el dueño de la selección puede compartir o revocar accesos.','ask_owner');
    }
    private function raw($id, $lock=false) {
        $row=$this->query('SELECT * FROM quantix_shopper_workspaces WHERE EmisorID=? AND WorkspaceID=?'.($lock?' FOR UPDATE':''),[$this->tenant->emisorId,$id])->fetch();
        if (!$row) throw new QuantixShopperError(404,'WORKSPACE_NOT_FOUND','La selección no está disponible.','create_workspace');
        if((int)$row['ExpiresAt']<=time()) throw new QuantixShopperError(410,'WORKSPACE_EXPIRED','La selección venció después de siete días sin cambios.','create_workspace');
        return $row;
    }
    public function productRows(array $ids) {
        $ids=array_values(array_unique(array_map(function($id){return preg_replace('/__decant$/D','',$id);},$ids)));
        if (!$ids) return [];
        $q=$this->query("SELECT p.*,ps.FamiliaOlfativa,ps.AcordesPrincipales,ps.TieneDecant,ps.PrecioDecant,ps.RadarProyeccion,ps.RadarLongevidad,ps.RadarElogios,ps.RadarVersatilidad,ps.RadarDulzorFrescura,ps.RadarTempMin,ps.RadarTempMax FROM productos p LEFT JOIN productos_sensorial ps ON ps.ProductoID=p.ProductoID AND ps.EmisorID=p.EmisorID WHERE p.EmisorID=? AND p.ProductoID IN (".implode(',',array_fill(0,count($ids),'?')).") AND (p.EnTiendaOnline='SI' OR p.EnTiendaOnline IS NULL) AND (p.TiendaInicio IS NULL OR p.TiendaInicio<=NOW()) AND (p.TiendaFin IS NULL OR p.TiendaFin>=NOW())",array_merge([$this->tenant->emisorId],$ids));
        $rows=[]; foreach ($q->fetchAll() as $row) $rows[$row['ProductoID']]=$row;
        return $rows;
    }
    public function quote(array $state, array $rows = null) {
        if ($rows === null) $rows=$this->productRows(array_column($state['cart']['items'],'id'));
        $quote=['status'=>'CURRENT','checked_at'=>gmdate('c'),'currency'=>'MXN','subtotal'=>0,'iva'=>0,'ieps'=>0,'total'=>0,'stock_reserved'=>false,'payment_status'=>'UNVERIFIED','cfdi_status'=>'NOT_ISSUED','pricing_complete'=>true,'lines'=>[],'blockers'=>[],'price_changes'=>[], 'within_budget'=>null,'order_mode'=>QuantixBusinessProfile::canShop($this->tenant->apexConfig)?'pending_payment':'consultation_or_booking','message'=>'Precios actuales del catálogo. La disponibilidad no está reservada; pago y factura requieren sus procesos existentes.'];
        $quantities=[];
        foreach ($state['cart']['items'] as $item) {
            $base=preg_replace('/__decant$/D','',$item['id']); $product=$rows[$base]??null;
            try {
                // Derive today's amount first; compare the displayed price separately and block checkout when changed.
                $priced=$item; unset($priced['priceWithTax']);
                $line=QuantixPendingOrderContract::line($priced,$product,$this->tenant->isPerfumery());
                $line['item_id']=$item['id'];$line['base_id']=$base;
                $line['priceWithTax']=round($line['unitPrice']*(1+$line['vatRate']/100)*(1+$line['iepsRate']/100),2);
                $tracked=($product['EnInventario']??'NO')==='SI' && $line['format']==='full'; $available=$tracked?(float)$product['cantidad']:null;
                $line['availability']=['status'=>$tracked?'available':'untracked','quantity'=>$available];
                $quantities[$base]=($quantities[$base]??0)+($line['format']==='full'?$line['qty']:0);
                if ($tracked && $line['format']==='full' && $quantities[$base]>$available) {
                    $line['availability']['status']='unavailable';
                    $quote['blockers'][]=['id'=>$item['id'],'code'=>'STOCK_CHANGED','message'=>'La cantidad supera la disponibilidad publicada.'];
                }
                if (isset($item['priceWithTax']) && abs($item['priceWithTax']-$line['priceWithTax'])>0.02) {
                    $quote['price_changes'][]=['id'=>$item['id'],'previous'=>$item['priceWithTax'],'current'=>$line['priceWithTax']];
                    $quote['blockers'][]=['id'=>$item['id'],'code'=>'PRICE_CHANGED','message'=>'El precio cambió. Revisa el importe actual antes de continuar.'];
                }
                $quote['lines'][]=$line;
                foreach (['subtotal','iva','ieps','total'] as $field) $quote[$field]+=$line[$field];
            } catch (InvalidArgumentException $e) { $quote['pricing_complete']=false;$quote['blockers'][]=['id'=>$item['id'],'code'=>'PRODUCT_REQUIRES_REVIEW','message'=>$e->getMessage()]; }
        }
        foreach (['subtotal','iva','ieps','total'] as $field) $quote[$field]=round($quote[$field],2);
        if(!$quote['pricing_complete']){$quote['known_total']=$quote['total'];$quote['total']=null;}
        if ($state['intent']['budget'] !== null && $quote['pricing_complete']) $quote['within_budget']=$quote['total']<=$state['intent']['budget'];
        if (!QuantixBusinessProfile::canShop($this->tenant->apexConfig)) $quote['blockers'][]=['id'=>null,'code'=>'ADVISOR_REQUIRED','message'=>'Este negocio continúa por consulta o cita.'];
        if ($quote['within_budget']===false) $quote['blockers'][]=['id'=>null,'code'=>'BUDGET_EXCEEDED','message'=>'La selección supera tu presupuesto. Revisa cantidades u opciones antes de continuar.'];
        if ($quote['blockers']) $quote['status']='BLOCKED';
        $quote['fingerprint']=hash('sha256',$this->json([$quote['lines'],$quote['blockers']]));
        return $quote;
    }
    private function projection(array $row) {
        $facts=QuantixProductFacts::sensory($row,$this->tenant->isPerfumery());
        $price=null;
        try { $line=QuantixPendingOrderContract::line(['id'=>$row['ProductoID'],'qty'=>1],$row,$this->tenant->isPerfumery()); $price=round($line['total'],2); } catch (InvalidArgumentException $e) {}
        return array_merge(['id'=>$row['ProductoID'],'name'=>trim(strip_tags($row['descripcion']??'')),'description'=>trim(strip_tags($row['descripcion_tienda']??'')),'category'=>trim(strip_tags($row['categoria']??'')),'unit'=>$row['unidad']??'','sku'=>$row['SKU']??'','priceWithTax'=>$price,'stockTracked'=>($row['EnInventario']??'NO')==='SI','stock'=>($row['EnInventario']??'NO')==='SI'?(float)$row['cantidad']:null,'hasDecant'=>$this->tenant->isPerfumery() && ($row['TieneDecant']??'NO')==='SI' && (float)($row['PrecioDecant']??0)>0,'decantPrice'=>$this->tenant->isPerfumery() && ($row['TieneDecant']??'NO')==='SI' && (float)($row['PrecioDecant']??0)>0?(float)$row['PrecioDecant']:null,'fact_source'=>'published_catalog'], $facts);
    }
    public function latestRegistration($id) {
        $row=$this->query('SELECT o.ResponseJSON,o.PayloadJSON,o.CreatedAt FROM quantix_shopper_orders s JOIN quantix_pending_orders o ON o.EmisorID=s.EmisorID COLLATE utf8mb4_unicode_ci AND o.OrderID=s.OrderID COLLATE utf8mb4_unicode_ci WHERE s.EmisorID=? AND s.WorkspaceID=? ORDER BY s.SequenceID DESC LIMIT 1',[$this->tenant->emisorId,$id])->fetch();
        if (!$row) return null;
        $response=json_decode($row['ResponseJSON'],true); if (!is_array($response)) return null;
        $safe=array_intersect_key($response,array_flip(['OrderFolio','OrderStatus','PaymentStatus','Total','Subtotal','IVA','IEPS','PaymentMethod','CfdiStatus','NotificationStatus','Message']));
        $payload=json_decode($row['PayloadJSON'],true);
        $safe['cart_identity']=null;
        if(is_array($payload) && isset($payload['items']) && is_array($payload['items'])){
            try{$safe['cart_identity']=QuantixShopperContract::cartIdentity($payload['items']);}catch(QuantixShopperError $e){/* Corrupt historical identity is unknown; no customer payload is exposed. */}
        }
        $safe['created_at']=$row['CreatedAt'];$safe['receipt_kind']='registration';$safe['state_scope']='at_registration'; return $safe;
    }
    public function recordOrder($workspaceId, $orderId) {
        $this->ownedWorkspace($workspaceId);
        if (!is_string($orderId) || !preg_match('/^[a-f0-9]{32}$/D',$orderId)) throw new QuantixShopperError(422,'INVALID_ORDER','El registro de solicitud no es válido.');
        $order=$this->query('SELECT OrderID FROM quantix_pending_orders WHERE EmisorID=? AND OrderID=?',[$this->tenant->emisorId,$orderId])->fetch();
        if (!$order) throw new QuantixShopperError(404,'ORDER_NOT_FOUND','La solicitud no está registrada.');
        $existing=$this->query('SELECT WorkspaceID FROM quantix_shopper_orders WHERE EmisorID=? AND OrderID=?',[$this->tenant->emisorId,$orderId])->fetchColumn();
        if($existing && $existing!==$workspaceId)throw new QuantixShopperError(409,'ORDER_WORKSPACE_CONFLICT','La solicitud ya corresponde a otra selección.','read_current_state');
        $this->query('INSERT IGNORE INTO quantix_shopper_orders (EmisorID,WorkspaceID,OrderID,CreatedAt) VALUES (?,?,?,NOW())',[$this->tenant->emisorId,$workspaceId,$orderId]);
        $bound=$this->query('SELECT WorkspaceID FROM quantix_shopper_orders WHERE EmisorID=? AND OrderID=?',[$this->tenant->emisorId,$orderId])->fetchColumn();
        if($bound!==$workspaceId)throw new QuantixShopperError(409,'ORDER_WORKSPACE_CONFLICT','La solicitud ya corresponde a otra selección.','read_current_state');
    }
    public function read($id) {
        $row=$this->raw($id); $state=json_decode($row['StateJSON'],true);
        $ids=array_merge($state['shortlist'],array_column($state['cart']['items'],'id')); $rows=$this->productRows($ids);
        $products=[]; foreach ($rows as $p) $products[]=$this->projection($p);
        $allowed=$this->actor==='owner'?['read','update','quote','recommend','grant','revoke','handoff']:['read','quote','recommend'];
        if ($this->actor==='agent' && in_array('write',json_decode($this->grant['ScopeJSON'],true),true)) $allowed[]='update';
        $response=['Status'=>'OK','workspace'=>['id'=>$id,'tenant'=>$this->tenant->emisorId,'revision'=>(int)$row['Revision'],'state'=>$state,'products'=>$products,'updated_at'=>$row['UpdatedAt'],'expires_at'=>gmdate('c',(int)$row['ExpiresAt']),'allowed_actions'=>$allowed,'last_order'=>$this->latestRegistration($id)],'quote'=>$this->quote($state,$rows)];
        if ($this->actor==='owner') {
            if(QuantixBusinessProfile::canShop($this->tenant->apexConfig) && !empty($this->tenant->paymentSettings['spei_ready']) && $state['cart']['items'] && $response['quote']['status']==='CURRENT')$response['workspace']['allowed_actions'][]='human_checkout';
            $grants=$this->query('SELECT GrantID,ScopeJSON,Kind,ExpiresAt,BudgetCeiling FROM quantix_shopper_grants WHERE EmisorID=? AND WorkspaceID=? AND RevokedAt IS NULL AND ConsumedAt IS NULL AND ExpiresAt>? ORDER BY CreatedAt DESC',[$this->tenant->emisorId,$id,time()])->fetchAll();
            $response['workspace']['grants']=array_map(function($g){return ['grant_id'=>$g['GrantID'],'id'=>$g['GrantID'],'scopes'=>json_decode($g['ScopeJSON'],true),'kind'=>$g['Kind'],'expires_at'=>gmdate('c',(int)$g['ExpiresAt']),'budget_ceiling'=>$g['BudgetCeiling']===null?null:(float)$g['BudgetCeiling']];},$grants);
            $response['workspace']['active_grants']=$response['workspace']['grants'];
            $otherOwners=(int)$this->query('SELECT COUNT(*) FROM quantix_shopper_owners WHERE EmisorID=? AND WorkspaceID=? AND OwnerHash<>? AND ExpiresAt>?',[$this->tenant->emisorId,$id,$this->ownerHash(),time()])->fetchColumn();
            $response['workspace']['other_owners_count']=$otherOwners;
            $response['csrf']=$this->csrf(); $response['csrf_token']=$this->csrf(); }
        $receipt=$this->query('SELECT ResponseJSON FROM quantix_shopper_receipts WHERE EmisorID=? AND WorkspaceID=? ORDER BY ReceiptRevision DESC,CreatedAt DESC LIMIT 1',[$this->tenant->emisorId,$id])->fetch();
        if ($receipt) $response['receipt']=json_decode($receipt['ResponseJSON'],true)['receipt']??null;
        return $response;
    }
    public function create(array $data) {
        $lock='qx-shopper-create-'.substr($this->ownerHash(),0,40);
        if((int)$this->query('SELECT GET_LOCK(?,3)',[$lock])->fetchColumn()!==1)throw new QuantixShopperError(503,'CREATE_BUSY','No pudimos confirmar la apertura. Reintenta el mismo intento.','retry_same_operation');
        try{return $this->createLocked($data);}finally{$this->query('SELECT RELEASE_LOCK(?)',[$lock]);}
    }
    private function createLocked(array $data) {
        $operation=QuantixShopperContract::identifier($data['operation_id']??null,true);
        if(isset($data['new_workspace']) && !is_bool($data['new_workspace']))throw new QuantixShopperError(422,'INVALID_CREATE','La opción de nueva selección no es válida.','correct_input');
        $createHash=hash('sha256',$this->json(['create',$this->tenant->emisorId,$operation,!empty($data['new_workspace'])]));
        $prior=$this->query('SELECT r.WorkspaceID,r.RequestHash,r.ResponseJSON FROM quantix_shopper_receipts r JOIN quantix_shopper_owners o ON o.EmisorID=r.EmisorID COLLATE utf8mb4_unicode_ci AND o.WorkspaceID=r.WorkspaceID COLLATE utf8mb4_unicode_ci WHERE r.EmisorID=? AND r.OperationID=? AND o.OwnerHash=? AND o.ExpiresAt>? LIMIT 1',[$this->tenant->emisorId,$operation,$this->ownerHash(),time()])->fetch();
        if($prior){
            if(!hash_equals($prior['RequestHash'],$createHash))throw new QuantixShopperError(409,'OPERATION_CONFLICT','Ese intento ya corresponde a otros datos.','new_operation_id');
            $this->ownedWorkspace($prior['WorkspaceID']);$result=$this->read($prior['WorkspaceID']);$result['receipt']=json_decode($prior['ResponseJSON'],true)['receipt'];$result['replayed']=true;$result['created']=false;return $result;
        }
        $id=$this->currentId();
        if ($id && empty($data['new_workspace'])) {try{$this->ownedWorkspace($id); $result=$this->read($id);$result['created']=false;return $result;}catch(QuantixShopperError $e){if(!in_array($e->machineCode,['WORKSPACE_EXPIRED','WORKSPACE_NOT_FOUND'],true))throw $e;unset($_SESSION['qx_shopper_active'][$this->tenant->emisorId]);$expiredPrevious=true;} }
        $created=$_SESSION['qx_shopper_creates']??[]; $created=array_filter($created,function($t){return $t>time()-3600;});
        if (count($created)>=12) throw new QuantixShopperError(429,'CREATE_LIMIT','Hay demasiadas selecciones nuevas. Abre la selección existente.','resume_workspace');
        $this->rate('create|'.($_SERVER['REMOTE_ADDR']??'local'),3600,30);
        $id=bin2hex(random_bytes(16)); $state=QuantixShopperContract::initial();
        $this->db->beginTransaction();
        try {
            $this->query('INSERT INTO quantix_shopper_workspaces (EmisorID,WorkspaceID,Revision,ExpiresAt,StateJSON,CreatedAt,UpdatedAt) VALUES (?,?,0,?,?,NOW(),NOW())',[$this->tenant->emisorId,$id,time()+604800,$this->json($state)]);
            $receipt=$this->receipt($id,0,$operation,'create');
            $this->storeReceipt($id,$operation,$createHash,['receipt'=>$receipt]);
            $this->attachOwner($id);
            $this->db->commit();
        } catch (Throwable $e) { if($this->db->inTransaction())$this->db->rollBack(); throw $e; }
        $_SESSION['qx_shopper_owners'][$this->tenant->emisorId][$id]=true; $_SESSION['qx_shopper_active'][$this->tenant->emisorId]=$id;
        $created[]=time(); $_SESSION['qx_shopper_creates']=$created;
        $_SESSION['qx_shopper_create_ops'][$this->tenant->emisorId][$operation]=$id;
        $response=$this->read($id); $response['receipt']=$receipt;$response['created']=true;if(isset($expiredPrevious))$response['previous_workspace_expired']=true; return $response;
    }
    private function receipt($id,$revision,$operation,$action) { return ['id'=>hash('sha256',$this->tenant->emisorId.'|'.$id.'|'.$operation),'operation_id'=>$operation,'action'=>$action,'workspace_id'=>$id,'revision'=>$revision,'actor'=>$this->actor,'grant_id'=>$this->grant['GrantID']??null,'status'=>'SAVED','created_at'=>gmdate('c'),'message'=>'Selección guardada en la tienda.']; }
    private function storeReceipt($id,$operation,$hash,$response) { $this->query('INSERT INTO quantix_shopper_receipts (EmisorID,WorkspaceID,OperationID,ReceiptRevision,RequestHash,ResponseJSON,CreatedAt) VALUES (?,?,?,?,?,?,NOW())',[$this->tenant->emisorId,$id,$operation,(int)$response['receipt']['revision'],$hash,$this->json($response)]); }
    public function mutate($action, array $data, $authorization) {
        $id=$data['workspace_id']??''; $operation=QuantixShopperContract::identifier($data['operation_id']??null,true);
        if(!is_string($id)||!preg_match('/^[a-f0-9]{32}$/D',$id))throw new QuantixShopperError(403,'ACCESS_REQUIRED','Abre tu selección o usa un acceso vigente.','request_handoff');
        $this->authenticate($id,$authorization,$action==='update');
        $this->rate('mutation|'.$this->tenant->emisorId.'|'.$id.'|'.hash('sha256',$authorization?:session_id()),60,120);
        $this->db->beginTransaction();
        try {
            $this->authenticate($id,$authorization,$action==='update');
            if ($action!=='update') $this->requireOwner();
            if ($this->actor==='owner' && (!is_string($data['_csrf']??null) || !hash_equals($this->csrf(),$data['_csrf']))) throw new QuantixShopperError(403,'CSRF_REQUIRED','Abre de nuevo la selección para continuar.','read_current_state');
            $row=$this->raw($id,true);
            $identity=$data; unset($identity['_csrf']); $hash=hash('sha256',$this->json([$action,$identity]));
            $prior=$this->query('SELECT RequestHash,ResponseJSON FROM quantix_shopper_receipts WHERE EmisorID=? AND WorkspaceID=? AND OperationID=?',[$this->tenant->emisorId,$id,$operation])->fetch();
            if ($prior) {
                if (!hash_equals($prior['RequestHash'],$hash)) throw new QuantixShopperError(409,'OPERATION_CONFLICT','Ese intento ya corresponde a otros datos.','new_operation_id');
                $saved=json_decode($prior['ResponseJSON'],true); $this->db->commit();
                $response=$this->read($id); $response['receipt']=$saved['receipt']; $response['replayed']=true;
                foreach (['grant_id','expires_at'] as $field) if(isset($saved[$field])) $response[$field]=$saved[$field];
                if(in_array($action,['grant','handoff'],true)) { $response['token']=null; $response['token_recovery']='revoke_and_issue_new'; }
                return $response;
            }
            $revision=$data['expected_revision']??null;
            if (!is_int($revision) || $revision!==(int)$row['Revision']) throw new QuantixShopperError(409,'REVISION_CONFLICT','La selección cambió en otra sesión. Revisa la versión actual.','read_current_state',['current_revision'=>(int)$row['Revision']]);
            $extra=[];
            if ($action==='update') {
                $state=QuantixShopperContract::state(json_decode($row['StateJSON'],true),$data['state']??null);
                if($this->actor==='agent') {
                    $before=json_decode($row['StateJSON'],true)['intent']['budget']; $after=$state['intent']['budget']; $ceiling=$this->grant['BudgetCeiling'];
                    if(($before!==null && ($after===null || $after>$before)) || ($ceiling!==null && ($after===null || $after>(float)$ceiling))) throw new QuantixShopperError(403,'MANDATE_EXCEEDED','El agente no puede ampliar ni retirar tu presupuesto.','ask_owner');
                }
                // Reject absent/cross-tenant shortlist products; unavailable saved cart remains recoverable through quote blockers.
                if ($state['shortlist']) {
                    $rows=$this->productRows($state['shortlist']);
                    foreach ($state['shortlist'] as $productId) if (!isset($rows[$productId])) throw new QuantixShopperError(422,'SHORTLIST_PRODUCT_UNAVAILABLE','Una opción ya no pertenece al catálogo disponible.','refresh_catalog');
                }
                $this->query('UPDATE quantix_shopper_workspaces SET StateJSON=?,Revision=Revision+1,ExpiresAt=?,UpdatedAt=NOW() WHERE EmisorID=? AND WorkspaceID=?',[$this->json($state),time()+604800,$this->tenant->emisorId,$id]);
            } elseif ($action==='grant' || $action==='handoff') {
                $scopes=$action==='grant'?QuantixShopperContract::scopes($data['scopes']??['read']):['read','write'];
                $max=$action==='grant'?1800:600; $ttl=$data['ttl_seconds']??$max;
                if(!is_int($ttl)||$ttl<60||$ttl>$max) throw new QuantixShopperError(422,'INVALID_EXPIRY','El tiempo de acceso no es válido.','correct_input');
                $count=$this->query('SELECT COUNT(*) FROM quantix_shopper_grants WHERE EmisorID=? AND WorkspaceID=? AND ExpiresAt>? AND RevokedAt IS NULL AND ConsumedAt IS NULL',[$this->tenant->emisorId,$id,time()])->fetchColumn();
                if((int)$count>=10) throw new QuantixShopperError(429,'GRANT_LIMIT','Revoca un acceso vigente antes de crear otro.','revoke_unused_grant');
                $this->rate('grant|'.$this->tenant->emisorId.'|'.$id,3600,30);
                $grantId=bin2hex(random_bytes(16)); $token=bin2hex(random_bytes(32)); $expires=time()+$ttl;
                $this->query('INSERT INTO quantix_shopper_grants (EmisorID,WorkspaceID,GrantID,TokenHash,ScopeJSON,BudgetCeiling,Kind,ExpiresAt,CreatedAt) VALUES (?,?,?,?,?,?,?,?,NOW())',[$this->tenant->emisorId,$id,$grantId,hash('sha256',$token),$this->json($scopes),json_decode($row['StateJSON'],true)['intent']['budget'],$action==='grant'?'grant':'handoff',$expires]);
                $extra=['grant_id'=>$grantId,'expires_at'=>gmdate('c',$expires)];
                $this->query('UPDATE quantix_shopper_workspaces SET Revision=Revision+1,UpdatedAt=NOW() WHERE EmisorID=? AND WorkspaceID=?',[$this->tenant->emisorId,$id]);
            } elseif ($action==='revoke') {
                $grantId=$data['grant_id']??'';
                if($grantId==='all') {
                    $affected=$this->query('UPDATE quantix_shopper_grants SET RevokedAt=? WHERE EmisorID=? AND WorkspaceID=? AND RevokedAt IS NULL',[time(),$this->tenant->emisorId,$id])->rowCount();
                    $affected+=$this->query('DELETE FROM quantix_shopper_owners WHERE EmisorID=? AND WorkspaceID=? AND OwnerHash<>?',[$this->tenant->emisorId,$id,$this->ownerHash()])->rowCount();
                } else {
                    if(!is_string($grantId)||!preg_match('/^[a-f0-9]{32}$/D',$grantId)) throw new QuantixShopperError(422,'INVALID_GRANT','El acceso no es válido.','correct_input');
                    $affected=$this->query('UPDATE quantix_shopper_grants SET RevokedAt=? WHERE EmisorID=? AND WorkspaceID=? AND GrantID=?',[time(),$this->tenant->emisorId,$id,$grantId])->rowCount();
                    $this->query('DELETE FROM quantix_shopper_owners WHERE EmisorID=? AND WorkspaceID=? AND OwnerHash<>?',[$this->tenant->emisorId,$id,$this->ownerHash()]);
                    if(!$affected) throw new QuantixShopperError(404,'GRANT_NOT_FOUND','El acceso no pertenece a esta selección.','read_current_state');
                }
                $this->query('UPDATE quantix_shopper_workspaces SET Revision=Revision+1,UpdatedAt=NOW() WHERE EmisorID=? AND WorkspaceID=?',[$this->tenant->emisorId,$id]);
            } else throw new QuantixShopperError(400,'UNKNOWN_ACTION','Esta acción no está disponible.','discover_capabilities');
            $receipt=$this->receipt($id,$revision+1,$operation,$action); $saved=array_merge(['receipt'=>$receipt],$extra);
            $this->storeReceipt($id,$operation,$hash,$saved); $this->db->commit();
            $response=array_merge($this->read($id),$saved); if(isset($token))$response['token']=$token;
            return $response;
        } catch (Throwable $e) { if($this->db->inTransaction())$this->db->rollBack(); throw $e; }
    }
    public function claim(array $data) {
        $token=$data['token']??null;
        if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token)) throw new QuantixShopperError(401,'INVALID_HANDOFF','El enlace de continuación no es válido.','request_new_handoff');
        $operation=QuantixShopperContract::identifier($data['operation_id']??null,true);
        $this->db->beginTransaction();
        try {
            $grant=$this->query("SELECT * FROM quantix_shopper_grants WHERE TokenHash=? AND EmisorID=? AND Kind='handoff' FOR UPDATE",[hash('sha256',$token),$this->tenant->emisorId])->fetch();
            if($grant && $grant['ConsumedAt']!==null && $this->isOwner($grant['WorkspaceID'])) {
                $this->ownedWorkspace($grant['WorkspaceID']);
                $prior=$this->query('SELECT RequestHash,ResponseJSON FROM quantix_shopper_receipts WHERE EmisorID=? AND WorkspaceID=? AND OperationID=?',[$this->tenant->emisorId,$grant['WorkspaceID'],$operation])->fetch();
                $expected=hash('sha256',$this->json(['claim',$grant['GrantID'],$operation]));
                if($prior && hash_equals($prior['RequestHash'],$expected)){$this->db->commit();$result=$this->read($grant['WorkspaceID']);$result['receipt']=json_decode($prior['ResponseJSON'],true)['receipt'];$result['replayed']=true;return $result;}
            }
            if (!$grant || $grant['RevokedAt']!==null || $grant['ConsumedAt']!==null || (int)$grant['ExpiresAt']<=time()) throw new QuantixShopperError(401,'HANDOFF_EXPIRED','El enlace expiró o ya fue utilizado.','request_new_handoff');
            $id=$grant['WorkspaceID']; $row=$this->raw($id,true);
            $this->query('UPDATE quantix_shopper_grants SET ConsumedAt=? WHERE EmisorID=? AND GrantID=?',[time(),$this->tenant->emisorId,$grant['GrantID']]);
            $receipt=$this->receipt($id,(int)$row['Revision']+1,$operation,'claim');
            $this->query('UPDATE quantix_shopper_workspaces SET Revision=Revision+1,UpdatedAt=NOW() WHERE EmisorID=? AND WorkspaceID=?',[$this->tenant->emisorId,$id]);
            $this->storeReceipt($id,$operation,hash('sha256',$this->json(['claim',$grant['GrantID'],$operation])),['receipt'=>$receipt]);
            $this->attachOwner($id);
            $this->db->commit(); session_regenerate_id(true);
            $_SESSION['qx_shopper_csrf']=bin2hex(random_bytes(24));
            $_SESSION['qx_shopper_owners'][$this->tenant->emisorId][$id]=true; $_SESSION['qx_shopper_active'][$this->tenant->emisorId]=$id;
            $response=$this->read($id); $response['receipt']=$receipt; return $response;
        } catch (Throwable $e) { if($this->db->inTransaction())$this->db->rollBack(); throw $e; }
    }
    public function recommend($id) {
        $response=$this->read($id); $state=$response['workspace']['state'];
        $query=$state['intent']['query']; $budget=$state['intent']['budget'];
        $tokens=array_values(array_filter(preg_split('/\s+/u',QuantixRecommendationContract::normalize($query)),function($word){return strlen($word)>2;}));
        $where=[]; $args=[$this->tenant->emisorId];
        foreach(array_slice($tokens,0,12) as $token){$where[]="(p.descripcion LIKE ? OR p.categoria LIKE ? OR ps.FamiliaOlfativa LIKE ? OR ps.AcordesPrincipales LIKE ?)";for($i=0;$i<4;$i++)$args[]='%'.str_replace(['\\','%','_'],['\\\\','\\%','\\_'],$token).'%';}
        $sql="SELECT ps.*,p.* FROM productos p LEFT JOIN productos_sensorial ps ON ps.ProductoID=p.ProductoID AND ps.EmisorID=p.EmisorID WHERE p.EmisorID=? AND (p.EnTiendaOnline='SI' OR p.EnTiendaOnline IS NULL) AND (p.TiendaInicio IS NULL OR p.TiendaInicio<=NOW()) AND (p.TiendaFin IS NULL OR p.TiendaFin>=NOW())";
        if($where)$sql.=' AND ('.implode(' OR ',$where).')';
        $sql.=' ORDER BY p.descripcion ASC LIMIT 200';
        $candidates=$this->query($sql,$args)->fetchAll(); $ranked=[];
        foreach($candidates as $row){
            // Joined optional rows may have null duplicate IDs; reconstruct product identity from the selected alias.
            if(empty($row['ProductoID']))continue;
            $match=QuantixRecommendationContract::project($row,$query,[]); $facts=$this->projection($row);
            if($budget!==null && ($facts['priceWithTax']===null || $facts['priceWithTax']>$budget))continue;
            $ranked[]=array_merge($facts,['match_score'=>$match['match_score'],'matchReasons'=>$match['matchReasons'],'affinity'=>null]);
        }
        usort($ranked,function($a,$b){return $b['match_score']<=>$a['match_score'] ?: strcmp($a['name'],$b['name']);});
        $response['recommendations']=array_slice($ranked,0,6);
        $response['recommendation_method']=['type'=>'published_keyword_ranking','scanned_candidates'=>count($candidates),'candidate_limit'=>200,'confidence_probability'=>null,'message'=>'Coincidencias con datos publicados; revisa la ficha para confirmar características.'];
        return $response;
    }
    public static function discovery() {
        return ['Status'=>'OK','protocol'=>'quantix-shopper-workspace/1','endpoint'=>'api/shopper_workspace.php','catalog_endpoint'=>'api/catalog.php?tenant=<tenant>','recommendation_endpoint'=>'api/shopper_workspace.php?action=recommend&tenant=<tenant>&workspace_id=<id>','method'=>'POST application/json; GET for discover/read/quote/recommend','authentication'=>['owner'=>'HttpOnly hashed persistent QX_BUYER ownership (7 days), QX_SHOPPER session and X-QX-CSRF for changes; same-origin create/claim','agent'=>'Authorization: Bearer <explicit short-lived shopper grant>; never query-string tokens','handoff'=>'single-use capability in URL fragment; remove fragment before claim'],'scopes'=>['read'=>['read','quote','recommend'],'write'=>['update']],'mandate'=>['budget'=>'write agents may tighten, but cannot raise or remove the owner budget ceiling','currency'=>'MXN; currency changes unavailable','checkout'=>'a shopper grant never authorizes order submission'],'actions'=>['discover','create','read','update','quote','recommend','grant','revoke','handoff','claim'],'limits'=>['body_bytes'=>32768,'shortlist'=>4,'cart_items'=>100,'quantity'=>999,'grant_seconds'=>1800,'handoff_seconds'=>600,'workspace_idle_seconds'=>604800,'receipt_replay_seconds'=>604800,'active_grants'=>10,'anonymous_creates_per_ip_hour'=>30],'state_schema'=>['intent'=>['query'=>'string <=600 characters; shopping preferences only, no private customer information','budget'=>'positive MXN number with at most two decimal places or null'],'shortlist'=>'array of published product identifiers','cart'=>['items'=>'[{id, qty:integer, isDecant?:boolean, isSubscription?:boolean, isDuoPack?:boolean, isGift?:boolean, customFinish?:string|{id,name,priceDelta?}, priceWithTax?:number}]']],'mutation_schema'=>['action'=>'update|grant|revoke|handoff','tenant'=>'explicit store identifier','workspace_id'=>'32 lower-case hexadecimal','expected_revision'=>'current integer version','operation_id'=>'unique 16-64 alphanumeric/underscore/hyphen','state'=>'update patch: intent/shortlist/cart','scopes'=>'grant: read, optionally write','ttl_seconds'=>'grant 60..1800; handoff 60..600','grant_id'=>'revoke: issued grant identifier'],'example'=>['action'=>'update','tenant'=>'<tenant>','workspace_id'=>'<workspace_id>','expected_revision'=>1,'operation_id'=>'unique-operation-0001','state'=>['intent'=>['query'=>'Comparar opciones publicadas','budget'=>2000]]],'evidence'=>['saved'=>'durable workspace receipt and revision','quote'=>'live catalog pricing; stock never reserved','order'=>'human-created existing pending-payment request; no bank verification or fiscal issuance'],'forbidden_actions'=>['merchant_configuration','catalog_write','stock_reservation','order_submission_by_agent','payment_confirmation','fiscal_issuance'],'recovery'=>['REVISION_CONFLICT'=>'read current state; reconcile before a new operation','OPERATION_CONFLICT'=>'new operation_id for changed input','unknown_network_result'=>'retry identical operation_id/body; receipt replay verifies save','HANDOFF_EXPIRED'=>'owner issues a new one-time link','CAPABILITY_EXPIRED'=>'owner issues a new scoped grant','grant_token_lost'=>'revoke grant_id and issue a new grant; secrets are never retained in receipts']];
    }
}
