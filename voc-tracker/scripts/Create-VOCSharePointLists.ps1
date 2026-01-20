# Create-VOCSharePointLists.ps1
# This script creates the required SharePoint lists for the VOC Emissions Tracker
# Requires: PnP.PowerShell module (Install-Module PnP.PowerShell)

param(
    [Parameter(Mandatory=$true)]
    [string]$SiteUrl
)

# Connect to SharePoint
Write-Host "Connecting to SharePoint site: $SiteUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ============================================================
# Create VOC_Products List
# ============================================================
Write-Host "`nCreating VOC_Products list..." -ForegroundColor Yellow

$listName = "VOC_Products"
$list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue

if ($null -eq $list) {
    New-PnPList -Title $listName -Template GenericList
    Write-Host "  Created list: $listName" -ForegroundColor Green
} else {
    Write-Host "  List already exists: $listName" -ForegroundColor Gray
}

# Add columns to VOC_Products
$productColumns = @(
    @{Name="ProductName"; Type="Text"; Required=$true},
    @{Name="ProductNumber"; Type="Text"; Required=$false},
    @{Name="Supplier"; Type="Text"; Required=$false},
    @{Name="Category"; Type="Choice"; Choices=@("Basecoat","Hardener","Clearcoat","Solvent")},
    @{Name="ProductType"; Type="Choice"; Choices=@("automotive","non-automotive")},
    @{Name="SpecificGravity"; Type="Number"; DecimalPlaces=3},
    @{Name="VOC_LbsGal"; Type="Number"; DecimalPlaces=2},
    @{Name="HAP_Percent"; Type="Number"; DecimalPlaces=4},
    @{Name="DibasicEster_Percent"; Type="Number"; DecimalPlaces=4},
    @{Name="Ethylbenzene_Percent"; Type="Number"; DecimalPlaces=4},
    @{Name="Cumene_Percent"; Type="Number"; DecimalPlaces=4}
)

foreach ($col in $productColumns) {
    $existingField = Get-PnPField -List $listName -Identity $col.Name -ErrorAction SilentlyContinue
    if ($null -eq $existingField) {
        switch ($col.Type) {
            "Text" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Text -Required:$col.Required | Out-Null
            }
            "Choice" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Choice -Choices $col.Choices | Out-Null
            }
            "Number" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Number | Out-Null
                # Note: Decimal places need to be set via CSOM or the UI
            }
        }
        Write-Host "    Added column: $($col.Name)" -ForegroundColor Green
    } else {
        Write-Host "    Column exists: $($col.Name)" -ForegroundColor Gray
    }
}

# ============================================================
# Create VOC_UsageLog List
# ============================================================
Write-Host "`nCreating VOC_UsageLog list..." -ForegroundColor Yellow

$listName = "VOC_UsageLog"
$list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue

if ($null -eq $list) {
    New-PnPList -Title $listName -Template GenericList
    Write-Host "  Created list: $listName" -ForegroundColor Green
} else {
    Write-Host "  List already exists: $listName" -ForegroundColor Gray
}

# Add columns to VOC_UsageLog
$usageColumns = @(
    @{Name="UsageDate"; Type="DateTime"},
    @{Name="EmissionUnit"; Type="Choice"; Choices=@("EU-Coating Line-01","EU-Coating Line-02","EU-Coating Line-03")},
    @{Name="Gallons"; Type="Number"; DecimalPlaces=2},
    @{Name="VOC_Lbs"; Type="Number"; DecimalPlaces=2},
    @{Name="HAP_Lbs"; Type="Number"; DecimalPlaces=4},
    @{Name="Cumene_Lbs"; Type="Number"; DecimalPlaces=4},
    @{Name="DibasicEster_Lbs"; Type="Number"; DecimalPlaces=4},
    @{Name="Ethylbenzene_Lbs"; Type="Number"; DecimalPlaces=4},
    @{Name="Category"; Type="Text"},
    @{Name="ProductType"; Type="Text"}
)

foreach ($col in $usageColumns) {
    $existingField = Get-PnPField -List $listName -Identity $col.Name -ErrorAction SilentlyContinue
    if ($null -eq $existingField) {
        switch ($col.Type) {
            "Text" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Text | Out-Null
            }
            "DateTime" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type DateTime | Out-Null
            }
            "Choice" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Choice -Choices $col.Choices | Out-Null
            }
            "Number" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Number | Out-Null
            }
        }
        Write-Host "    Added column: $($col.Name)" -ForegroundColor Green
    } else {
        Write-Host "    Column exists: $($col.Name)" -ForegroundColor Gray
    }
}

# Add lookup column for ProductID
$lookupField = Get-PnPField -List $listName -Identity "ProductID" -ErrorAction SilentlyContinue
if ($null -eq $lookupField) {
    $productsListId = (Get-PnPList -Identity "VOC_Products").Id
    Add-PnPField -List $listName -DisplayName "ProductID" -InternalName "ProductID" -Type Lookup -AddToDefaultView | Out-Null
    # Note: Lookup configuration needs additional setup via UI or CSOM
    Write-Host "    Added column: ProductID (Lookup - configure in SharePoint UI)" -ForegroundColor Yellow
}

# ============================================================
# Create VOC_EmissionUnits List
# ============================================================
Write-Host "`nCreating VOC_EmissionUnits list..." -ForegroundColor Yellow

$listName = "VOC_EmissionUnits"
$list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue

if ($null -eq $list) {
    New-PnPList -Title $listName -Template GenericList
    Write-Host "  Created list: $listName" -ForegroundColor Green
} else {
    Write-Host "  List already exists: $listName" -ForegroundColor Gray
}

# Add columns
$unitColumns = @(
    @{Name="UnitName"; Type="Text"},
    @{Name="Description"; Type="Note"},
    @{Name="IsActive"; Type="Boolean"}
)

foreach ($col in $unitColumns) {
    $existingField = Get-PnPField -List $listName -Identity $col.Name -ErrorAction SilentlyContinue
    if ($null -eq $existingField) {
        switch ($col.Type) {
            "Text" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Text | Out-Null
            }
            "Note" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Note | Out-Null
            }
            "Boolean" {
                Add-PnPField -List $listName -DisplayName $col.Name -InternalName $col.Name -Type Boolean | Out-Null
            }
        }
        Write-Host "    Added column: $($col.Name)" -ForegroundColor Green
    } else {
        Write-Host "    Column exists: $($col.Name)" -ForegroundColor Gray
    }
}

# Add default emission units
Write-Host "`nAdding default emission units..." -ForegroundColor Yellow
$defaultUnits = @(
    @{Title="EU-Coating Line-01"; UnitName="Coating Line 01"; Description="Primary coating line"; IsActive=$true},
    @{Title="EU-Coating Line-02"; UnitName="Coating Line 02"; Description="Secondary coating line"; IsActive=$true},
    @{Title="EU-Coating Line-03"; UnitName="Coating Line 03"; Description="Tertiary coating line"; IsActive=$true}
)

foreach ($unit in $defaultUnits) {
    $existing = Get-PnPListItem -List "VOC_EmissionUnits" -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$($unit.Title)</Value></Eq></Where></Query></View>"
    if ($null -eq $existing) {
        Add-PnPListItem -List "VOC_EmissionUnits" -Values $unit | Out-Null
        Write-Host "    Added: $($unit.Title)" -ForegroundColor Green
    } else {
        Write-Host "    Exists: $($unit.Title)" -ForegroundColor Gray
    }
}

Write-Host "`n✓ SharePoint lists created successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Go to each list in SharePoint and verify column settings"
Write-Host "  2. Configure the ProductID lookup column in VOC_UsageLog to point to VOC_Products"
Write-Host "  3. Set decimal places for number columns as needed"
Write-Host "  4. Update src/config/authConfig.js with your site URL"

Disconnect-PnPOnline
