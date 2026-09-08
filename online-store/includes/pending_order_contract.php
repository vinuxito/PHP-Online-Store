<?php
/** Authoritative line calculation for a pending request, never a paid sale. */
class QuantixPendingOrderContract {
    public static function customer($data) {
        $fields = ['customerName' => 128, 'customerEmail' => 254, 'customerPhone' => 32, 'shippingAddress' => 1000, 'rfc' => 13, 'razonSocial' => 254, 'cp' => 5, 'regimen' => 3, 'usoCfdi' => 3];
        $customer = [];
        foreach ($fields as $field => $limit) {
            if (isset($data[$field]) && !is_scalar($data[$field])) throw new InvalidArgumentException('Datos del cliente inválidos.');
            $customer[$field] = trim((string)($data[$field] ?? ''));
            // Count UTF-8 characters without requiring the optional mbstring extension.
            $length = preg_match_all('/./us', $customer[$field], $characters);
            if ($length === false) throw new InvalidArgumentException('Datos del cliente inválidos.');
            if ($length > $limit) throw new InvalidArgumentException('Un campo del cliente supera el tamaño permitido.');
        }
        // Ñ is part of the RFC alphabet; ASCII strtoupper alone leaves lowercase ñ unchanged.
        $customer['rfc'] = strtoupper(str_replace('ñ', 'Ñ', $customer['rfc']));
        return $customer;
    }

    public static function line($item, $product, $perfumery) {
        if (!is_array($item) || !is_array($product)) throw new InvalidArgumentException('Producto no disponible.');
        $qty = filter_var($item['qty'] ?? null, FILTER_VALIDATE_INT);
        if ($qty === false || $qty < 1 || $qty > 999) throw new InvalidArgumentException('La cantidad debe ser un entero entre 1 y 999.');
        if (!empty($item['isDuoPack']) || !empty($item['isSubscription']) || !empty($item['isGift']) || !empty($item['customFinish'])) throw new InvalidArgumentException('Esta variante requiere una cotización de la tienda. Retírala del pedido y consulta su precio.');
        $id = (string)$product['ProductoID'];
        $decant = !empty($item['isDecant']);
        if ((string)($item['id'] ?? '') !== $id . ($decant ? '__decant' : '')) throw new InvalidArgumentException('La variante del producto no está disponible.');
        if (!isset($product['valorUnitario']) || !is_numeric($product['valorUnitario']) || (float)$product['valorUnitario'] < 0) throw new InvalidArgumentException('El producto no tiene un precio configurado.');
        $vat = isset($product['IVAtasa']) ? (float)$product['IVAtasa'] : 16.0;
        $ieps = isset($product['IEPStasa']) ? (float)$product['IEPStasa'] : 0;
        if ($vat > 0 && $vat <= 1) $vat *= 100;
        if ($ieps > 0 && $ieps <= 1) $ieps *= 100;
        if ($vat < 0 || $vat > 100 || $ieps < 0 || $ieps > 100) throw new InvalidArgumentException('El producto requiere revisión de impuestos.');
        $unit = (float)$product['valorUnitario'];
        if ($decant) {
            if (!$perfumery || ($product['TieneDecant'] ?? 'NO') !== 'SI' || !isset($product['PrecioDecant']) || (float)$product['PrecioDecant'] <= 0) throw new InvalidArgumentException('Este decant no tiene un precio configurado.');
            $unit = (float)$product['PrecioDecant'] / ((1 + $vat / 100) * (1 + $ieps / 100));
        }
        $subtotal = round($unit * $qty, 2);
        $iepsAmount = round($subtotal * $ieps / 100, 2);
        $vatAmount = round(($subtotal + $iepsAmount) * $vat / 100, 2);
        $total = round($subtotal + $iepsAmount + $vatAmount, 2);
        // A pending request must not silently accept a different displayed price.
        if (isset($item['priceWithTax']) && abs(round((float)$item['priceWithTax'], 2) - round($unit * (1 + $ieps / 100) * (1 + $vat / 100), 2)) > 0.02) throw new InvalidArgumentException('El precio cambió. Actualiza el catálogo y vuelve a agregar el producto.');
        return ['id' => $id, 'format' => $decant ? 'decant' : 'full', 'name' => trim(strip_tags((string)($product['descripcion'] ?? ''))), 'qty' => $qty, 'unitPrice' => round($unit, 6), 'vatRate' => $vat, 'iepsRate' => $ieps, 'subtotal' => $subtotal, 'iva' => $vatAmount, 'ieps' => $iepsAmount, 'total' => $total];
    }
}
