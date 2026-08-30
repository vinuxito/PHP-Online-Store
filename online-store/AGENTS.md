# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

CFD Manager 3.3 is a PHP-based electronic invoicing (CFDI) management system for Mexican businesses. It handles the complete lifecycle of Comprobantes Fiscales Digitales por Internet - creation, validation, stamping (timbrado), and management. This is a legacy procedural PHP application with OOP class components.

## Technology Stack

- **PHP 5.6+ / PHP 7** - Main backend language
- **MySQL** - Database (configured in `vx_utilerias.php`)
- **jQuery / jQuery UI** - Frontend framework
- **mPDF** - PDF generation library (`/mpdf/`)
- **PHP QR Code** - QR code generation (`/phpqrcode/`)
- **Composer** - Dependency management for PAC SDK

## Application Architecture

### Entry Points

- **`index.php`** → redirects to `menuemisor.php`
- **`accesoprotegido.php`** - Session-based authentication gate (included at top of protected pages)
- **`menuemisor.php`** - Main navigation hub after login

### Authentication Flow

1. User accesses any page including `accesoprotegido.php`
2. Session variables `$_SESSION['uid']` and `$_SESSION['pwd']` are checked (encrypted via `evinuxencrypt/evinuxdecrypt`)
3. `Usuario` class validates credentials via `buscaUsuario()`
4. On success, `EmisorID`, `NivelUsuario`, and `UsuarioID` are stored in encrypted session
5. Session timeout is 10 hours (`$inactive = 36000`)

### Core Business Classes (`tipos.php`)

The system uses several key classes defined in `tipos.php`:

- **`Emisor`** - Taxpayer entity management (lines 17-1587)
- **`CFD`** - Main CFDI invoice entity (lines 1589-4220)
- **`CFDConceptos`** - Invoice line items (lines 4222-6022)
- **`Usuario`** - User management (lines 6024+)

### Database Layer (`vx_utilerias.php`)

Custom database abstraction layer with:
- **Configuration**: Lines 14-20 define host, port, user, password, dbname
- **Connection functions**: `conectaabd()` and `cierrabd()` (line 3030, currently stubs)
- **Query builders**: `vx_insert()`, `vx_update()`, `vx_insert_update()`
- **Result functions**: `vx_sqlArray()`, `vx_sqlArrayIndx()`, `vx_singleread()`
- **Helper functions**: `strit()` for escaping, `vx_guid()` for UUIDs

**Important**: The connection functions are stubs returning false - actual connections likely happen via PDO/MySQLi elsewhere or through included files.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `/ajax/` | AJAX request handlers |
| `/certs/` | Digital certificates (.cer, .key files) |
| `/css/themes/` | UI themes (per-emisor customization) |
| `/js2/` | JavaScript files |
| `/lib/` | PHP libraries and composer vendor dependencies |
| `/mpdf/` | PDF generation library |
| `/phpqrcode/` | QR code generation |
| `/sql/` | Database utilities |
| `/xmls/` | Generated CFDI XML files |
| `/pdfs/` | Generated PDF representations |
| `/pac/` | PAC (Prov Autorizado de Certificación) service certificates |
| `/conversiones/` | Data conversion utilities |
| `/import/` | Data import functionality |

## CFDI Workflow

### Creating a CFDI

1. User navigates to invoice creation pages (`nvocfd*.php` for different CFDI versions)
2. Form collects: emisor (taxpayer), cliente (customer), products/conceptos, taxes, payment info
3. System generates XML with digital signature
4. PAC service is called for stamping (timbrado) via SmarterWeb/Lunasoft SDK
5. Stamped XML is saved to `/xmls/`
6. PDF is generated and saved to `/pdfs/`
7. QR code is embedded for validation

### Supported CFDI Versions

- CFDI 3.3 (primary)
- CFDI 4.0 (newer)

### Multi-Entity Support

The system supports multiple emisores (taxpayers):
- Each emisor has their own certificate (`certs/EmisorID.*`)
- Each emisor can have a custom UI theme (`css/themes/themename/`)
- Users can be associated with specific emisores
- Folios (invoice number sequences) can be shared or per-emisor

## PAC Integration

The system integrates with PAC (Prov Autorizado de Certificación) services for CFDI stamping:

- **SmarterWeb PAC SDK**: `/lib/vendor/lunasoft/sw-sdk-php/`
- PAC certificates stored in `/pac/`
- Stamping happens automatically after CFDI generation
- Error handling for PAC service failures

## Development Commands

### Database

```bash
# Access MySQL (credentials from vx_utilerias.php)
mysql -u cfdlibria -p cfd

# Import/export database
mysqldump -u cfdlibria -p cfd > backup.sql
mysql -u cfdlibria -p cfd < backup.sql
```

### Dependencies

```bash
# Install composer dependencies
cd /lamp/www/cfdadmin/lib
composer install
```

### Testing

- Manual testing via `testie.php` and `testiesql.php`
- No automated test framework configured

## Session & Encryption

- Session variables are encrypted using `evinuxencrypt()` / `evinuxdecrypt()`
- Key session variables: `EmisorID`, `NivelUsuario`, `UsuarioID`, `eUITheme`, `evinuxTipoCFD`
- `SessionVarHandler` class manages session state with `setVar()`, `getVar()`, `unsetVar()`

## Error Reporting

Configured in `accesoprotegido.php` line 12:
```php
error_reporting( E_ALL & ~E_NOTICE & ~E_STRICT & ~E_WARNING & ~E_DEPRECATED );
```

## Important Files

| File | Purpose |
|------|---------|
| `accesoprotegido.php` | Authentication gate, include at top of protected pages |
| `vx_utilerias.php` | Database utilities and helper functions |
| `tipos.php` | Core business entity classes |
| `menuemisor.php` | Main navigation after login |
| `include_files.php` | Common includes |
| `js.php` | Common JavaScript includes |
| `.htaccess` | Apache configuration |

## Code Patterns

### Including the Authentication Guard

```php
<?php
include 'accesoprotegido.php';
// Now you have access to:
// - $SessionVarHandler
// - $EmisorID (encrypted in session)
// - $NivelUsuario (encrypted in session)
// - $UsuarioID (encrypted in session)
?>
```

### Database Query Pattern

```php
conectaabd();
$result = vx_sqlArray("SELECT * FROM tabla WHERE campo='valor'");
$single = vx_singleread("SELECT campo FROM tabla WHERE id=1");
```

### Entity Loading Pattern

```php
$Emisor = new Emisor;
$Emisor->leeEmisor($EmisorID);

$Usuario = new Usuario;
$Usuario->leeUsuario($UsuarioID);

$CFD = new CFD;
$CFD->leeCFD($CFDID);
```

## User Levels (NivelUsuario)

Used throughout the system for access control:
- Level 5: Admin/superuser (can access `emisores.php`)
- Lower levels: Regular users with restricted access

## Special Considerations

1. **Legacy Codebase**: Uses procedural PHP with some OOP, global variables, and mixed Spanish/English
2. **No Version Control**: Repository shows no git history
3. **Certificate Management**: Digital certificates have expiration dates that must be monitored
4. **Folio Management**: Invoice sequences (folios) must be monitored before exhaustion
5. **PAC Service Dependencies**: CFDI stamping requires active PAC subscription and valid certificates
6. **Per-Emisor Configuration**: Many settings are per-emisor, not global
7. **Encryption Used**: Credentials and sensitive session data are encrypted
8. **Theme System**: UI can be customized per-emisor via `eUITheme` property
