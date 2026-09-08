<?php
/** Pure public capabilities and request context; no database or external effects. */
require_once '/lamp/www/cfdadmin/lib/QuantixIndustryContract.php';
class StorefrontControlContract {
    public static function context($query, $post, $body, $host) {
        $ids = [];
        $slugs = [];
        foreach ([$query, $post, $body] as $source) {
            if (!is_array($source)) continue;
            foreach (['emisor', 'tenant', 'emisorId'] as $key) {
                if (!array_key_exists($key, $source)) continue;
                if (!is_scalar($source[$key])) throw new InvalidArgumentException('Contexto de tienda inválido.');
                $value = trim((string)$source[$key]);
                if (!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $value)) throw new InvalidArgumentException('Contexto de tienda inválido.');
                $ids[$value] = true;
            }
            if (array_key_exists('slug', $source)) {
                if (!is_scalar($source['slug'])) throw new InvalidArgumentException('Subdominio inválido.');
                $slug = strtolower(trim((string)$source['slug']));
                if (!preg_match('/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/D', $slug)) throw new InvalidArgumentException('Subdominio inválido.');
                $slugs[$slug] = true;
            }
        }
        $host = strtolower(preg_replace('/:\d+$/', '', (string)$host));
        $hostSlug = '';
        if (preg_match('/^([a-z0-9-]+)\.evinux\.net$/D', $host, $match) && !in_array($match[1], ['www', 'speed', 'quantix-panel', 'mail', 'api'], true)) $hostSlug = $match[1];
        if (count($ids) > 1 || count($slugs) > 1) throw new InvalidArgumentException('La solicitud mezcla tiendas distintas.');
        $id = $ids ? (string)key($ids) : '';
        $slug = $slugs ? (string)key($slugs) : '';
        if ($slug && $hostSlug && $slug !== $hostSlug) throw new InvalidArgumentException('El subdominio no coincide con la tienda solicitada.');
        return ['id' => $id, 'slug' => $slug ?: $hostSlug, 'host_slug' => $hostSlug, 'explicit' => (bool)($id || $slug || $hostSlug)];
    }

    public static function validClabe($value) {
        if (!preg_match('/^[0-9]{18}$/D', (string)$value) || $value === str_repeat('0', 18)) return false;
        $sum = 0;
        $weights = [3, 7, 1];
        for ($i = 0; $i < 17; $i++) $sum += (((int)$value[$i]) * $weights[$i % 3]) % 10;
        return (10 - ($sum % 10)) % 10 === (int)$value[17];
    }

    public static function payments($config, $deMap = []) {
        $saved = isset($config['payment_gateways']) && is_array($config['payment_gateways']) ? $config['payment_gateways'] : [];
        $read = function($key, $projection, $default = '') use ($saved, $deMap) {
            return array_key_exists($key, $saved) ? $saved[$key] : ($deMap[$projection] ?? $default);
        };
        $bank = trim(html_entity_decode((string)$read('spei_bank', 'STORE_SPEI_BANK'), ENT_QUOTES, 'UTF-8'));
        $clabe = preg_replace('/\s+/', '', (string)$read('spei_clabe', 'STORE_SPEI_CLABE'));
        $beneficiary = trim(html_entity_decode((string)$read('spei_beneficiary', 'STORE_SPEI_BENEFICIARY'), ENT_QUOTES, 'UTF-8'));
        $invoice = in_array($read('auto_cfdi', 'STORE_AUTO_CFDI', false), [true, 1, '1', 'SI'], true);
        $series = trim((string)$read('cfdi_serie', 'STORE_CFDI_SERIE'));
        if (!preg_match('/^[a-zA-Z0-9_-]{0,25}$/D', $series)) $series = '';
        return [
            'spei_ready' => $bank !== '' && $beneficiary !== '' && self::validClabe($clabe),
            'spei_bank' => $bank, 'spei_clabe' => $clabe, 'spei_beneficiary' => $beneficiary,
            'auto_cfdi' => $invoice, 'invoice_request_enabled' => $invoice, 'cfdi_serie' => $series,
            'stripe_ready' => false, 'paypal_ready' => false, 'automatic_stamping' => false,
            'notification_status' => 'unavailable', 'order_mode' => 'pending_payment'
        ];
    }

    public static function isRealEstate($config, $description = '') {
        return QuantixIndustryContract::resolve($config, $description) === 'real_estate';
    }
}
