<?php
/** Keyword ranking over published facts. A ranking score is never a probability. */
require_once __DIR__ . '/pending_order_contract.php';
class QuantixRecommendationContract {
    public static function normalize($value) {
        return strtr(mb_strtolower((string)$value, 'UTF-8'), ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
    }
    public static function strings($raw) {
        $values = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($values) || array_keys($values) !== range(0, count($values)-1)) return [];
        return array_values(array_filter(array_slice($values,0,20),function($v){return is_string($v) && trim($v)!=='' && strlen($v)<=200;}));
    }
    public static function measurement($row,$key,$min,$max) {
        $v=$row[$key]??null;
        return is_numeric($v) && is_finite((float)$v) && $v>=$min && $v<=$max ? (float)$v : null;
    }
    public static function project(array $row,$query,array $detected) {
        $score=0.0; $reasons=[];
        $accords=self::strings($row['AcordesPrincipales']??null);
        $facts=self::normalize(($row['descripcion']??'').' '.($row['FamiliaOlfativa']??'').' '.implode(' ',$accords));
        $tokens=array_unique(array_filter(preg_split('/\s+/u',self::normalize($query)),function($t){return strlen($t)>2;}));
        foreach(array_slice($tokens,0,30) as $token) {
            if(strpos($facts,$token)!==false){$score+=8.0;$reasons[]='Coincide con «'.$token.'» en el catálogo.';}
        }
        foreach(['occasions'=>['playa'=>'OcasionPlaya','cita'=>'OcasionCita','formal'=>'OcasionFormal','fiesta'=>'OcasionFiesta','diario'=>'OcasionDiario'], 'seasons'=>['verano'=>'TemporadaVerano','invierno'=>'TemporadaInvierno']] as $group=>$fields) {
            foreach($detected[$group]??[] as $choice) {
                if(!isset($fields[$choice]))continue;
                $value=self::measurement($row,$fields[$choice],0,10);
                if($value!==null && $value>0){$score+=$value*($group==='occasions'?2.8:2.2);$reasons[]='Valoración publicada para '.$choice.': '.$value.'/10.';}
            }
        }
        $sillage=self::measurement($row,'Estela',0,5);
        $longevity=self::measurement($row,'LongevidadHoras',0,48);
        if(($detected['intensity']??'')==='bestia' && (($sillage!==null && $sillage>=3)||($longevity!==null && $longevity>=9))){$score+=12.0;$reasons[]='Intensidad o duración registrada en el catálogo.';}
        $gender=$row['GeneroTarget']??null;
        if(!empty($detected['gender']) && in_array($gender,[$detected['gender'],'UNISEX'],true)){$score+=8.0;$reasons[]='Público registrado: '.$gender.'.';}
        $price=null;
        try{$line=QuantixPendingOrderContract::line(['id'=>(string)($row['ProductoID']??''),'qty'=>1],$row,true);$price=$line['total'];}catch(InvalidArgumentException $e){}
        return ['id'=>$row['ProductoID'],'code'=>$row['noIdentificacion']??'','sku'=>$row['SKU']??'',
            'name'=>trim(strip_tags((string)($row['descripcion']??''))), 'price'=>is_numeric($row['valorUnitario']??null)?(float)$row['valorUnitario']:null,
            'finalPrice'=>$price,'affinity'=>null,'match_score'=>$score,'matchReasons'=>$reasons,'evidence_source'=>'published_catalog',
            'family'=>is_string($row['FamiliaOlfativa']??null)?trim($row['FamiliaOlfativa']):'', 'accords'=>$accords,
            'notes'=>['top'=>self::strings($row['NotasSalida']??null),'heart'=>self::strings($row['NotasCorazon']??null),'base'=>self::strings($row['NotasFondo']??null)],
            'sillage'=>$sillage,'longevity'=>$longevity,
            'sommelierNote'=>trim(strip_tags((string)($row['NotaSommelier']??''))) ?: ($reasons?implode(' ',array_slice($reasons,0,3)):'Sin coincidencias documentadas; revisa la ficha o consulta a la tienda.')];
    }
}
