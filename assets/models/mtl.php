<?php

// Suppress errors to prevent breaking the MTL file format which would cause the 3D model not to load in the configurator. Errors are logged in PHP error log instead.
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// Set content type to plain text for MTL file format
header('Content-Type: text/plain; charset=UTF-8');
$fileversion = $_GET['fileversion'];

// Ensure that param string only added if version value is set. No orphaned ? in url
$ver = $fileversion ? "?$fileversion" : ""; 
$itemColour = $_GET['colour'];
$itemSecondColour = $_GET['secondcolour'];
$itemSecondColourName = $_GET['secondcolourname'];
$itemThirdColour = $_GET['thirdcolour'];
$itemFourthColour = $_GET['fourthcolour'];
$itemUnderColour = $_GET['undercolour'];
$itemGlassColour = $_GET['glasscolour'];
$itemMetalColour = $_GET['metalcolour'];
$itemProfileColour = $_GET['profilecolour'];
$itemMeshColour = $_GET['meshcolour'];
$itemAdjustment = $_GET['adjustment'];

$polished = array( "swatch-golden-ambra", "swatch-ivory-gioiello", "swatch-laguna-blanca", "swatch-riverbed", "swatch-calacatta-viola");
$honed = array("swatch-verde-vittoria", "swatch-macchia-suprema", "swatch-marble-calacatta-gold", "swatch-calacatta-macchia-vecchia",  "swatch-dark-marquina", "swatch-fior-di-bosco", "swatch-macchia-vecchia", "swatch-quarzite-taj-mahal", "swatch-travertine-silver", "swatch-travertine-silver-horizontal","swatch-travertine-chiaro-horizontal","swatch-travertine-chiaro","swatch-viola-rosso","swatch-taj-mahal-pearl","swatch-statuario","swatch-michelangelo-bianco","swatch-laurent-golden","swatch-calacatta-luxury","swatch-royal-botticino","swatch-mogao-white","swatch-black-horse","swatch-bianca-luna","swatch-arabescato-new","swatch-raffaello");
$realwood = array("swatch-american-walnut", "swatch-jet-black");
$woodeffect = array("swatch-acacia", "swatch-maple", "swatch-moro", "swatch-acacia-horizontal", "swatch-maple-horizontal", "swatch-moro-horizontal", "swatch-mogano", "swatch-mulberry", "swatch-cobolo", "swatch-mogano-horizontal", "swatch-mulberry-horizontal", "swatch-cobolo-horizontal");
$dullmetal = array("banding-decorative-bronze", "banding-satin-black");
$fullVein = array("swatch-black-horse", "swatch-arabescato-new");
$yellowProfile = array("swatch-travertino-romano", "swatch-ivory-gioiello", "swatch-royal-botticino", "swatch-sassi-di-matera", "swatch-tundra");
$greenProfile = array("swatch-verde-vittoria");
$warmProfile = array("swatch-travertino-minimal-white", "swatch-golden-ambra", "swatch-taj-mahal-pearl", "swatch-bianca-luna", "swatch-travertine-chiaro");
$darkProfile = array("swatch-pietra-grey", "swatch-dark-marquina", "swatch-laurent-golden");
$honedProfile = array("swatch-marble-calacatta-gold", "swatch-calacatta-macchia-vecchia",  "swatch-dark-marquina", "swatch-fior-di-bosco", "swatch-macchia-vecchia", "swatch-quarzite-taj-mahal", "swatch-travertine-silver", "swatch-travertine-silver-horizontal","swatch-travertine-chiaro-horizontal","swatch-travertine-chiaro","swatch-viola-rosso","swatch-taj-mahal-pearl","swatch-statuario","swatch-michelangelo-bianco","swatch-laurent-golden","swatch-calacatta-luxury","swatch-royal-botticino","swatch-mogao-white","swatch-black-horse","swatch-bianca-luna","swatch-arabescato-new","swatch-raffaello");

?>
# 3ds Max Wavefront OBJ Exporter v0.97b - (c)2007 guruware
# File Created: 17.01.2019 16:55:56


<?php if (!empty($itemColour)) { 

  if (in_array($itemColour, $polished)) {  // if top is Polished

    echo "newmtl $itemColour\n";
    echo "Ka 1 1 1\n";
    echo "Kd 1 1 1\n";
    echo "Ks 1 1 1\n";
    echo "Ns 1000\n";
    echo "sharpness 1000\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemColour.jpg$ver\n";

 } elseif (in_array($itemColour, $honed)) {  // if top is Honed
 
    echo "newmtl $itemColour\n";
    echo "Ka 1 1 1\n";
    echo "Kd 1 1 1\n";
    echo "Ks 1 1 1\n";
    echo "Ns 100\n";
    echo "sharpness 0\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemColour.jpg$ver\n";
 
  } else { // Natural
  
    echo "newmtl $itemColour\n";
    echo "Ka 1 1 1\n";
    echo "Kd 1 1 1\n";
    echo "Ks 1 1 1\n";
    echo "Ns 50\n";
    echo "sharpness 0\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemColour.jpg$ver\n";
 
  } // End if $itemColour is Natural
}  // End if $itemColour 

if (!empty($itemSecondColour)) { 

  if (in_array($itemSecondColour, $polished)) {  // if top is Polished

    echo "newmtl $itemSecondColourName\n";
    echo "Ka 0.75 0.75 0.75\n";
    echo "Kd 0.75 0.75 0.75\n";
    echo "Ks 0.25 0.25 0.25\n";
    echo "Ns 400\n";
    echo "sharpness 1000\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemSecondColour.jpg$ver\n";

 } elseif (in_array($itemSecondColour, $honed)) {  // if top is Honed
 
    echo "newmtl $itemSecondColourName\n";
    echo "Ka 0.6 0.6 0.6\n";
    echo "Kd 0.7 0.7 0.7\n";
    echo "Ks 0.24 0.24 0.24\n";
    echo "Ns 25\n";
    echo "sharpness 0\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemSecondColour.jpg$ver\n";
 
  } elseif (in_array($itemSecondColour, $woodeffect)) {  // if top is Honed
 
    echo "newmtl $itemSecondColourName\n";
    echo "Ka 0.5 0.5 0.5\n";
    echo "Kd 0.5 0.5 0.5\n";
    echo "Ks 0.25 0.25 0.25\n";
    echo "Ns 15\n";
    echo "sharpness 0\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemSecondColour.jpg$ver\n";
 
  } elseif (in_array($itemSecondColour, $realwood)) {  // if base is wood
    
    echo "newmtl $itemSecondColourName\n";
    echo "Ka 0.1 0.1 0.1\n";
    echo "Kd 0.640000 0.640000 0.60000\n";
    echo "Ks 0.15 0.15 0.15\n";
    echo "Ns 15\n";
    echo "Ni 1.000000\n";
    echo "d 1.000000\n";
    echo "illum 0\n";
    echo "map_Kd textures/$itemSecondColour.jpg$ver\n";
        
  } else { // Natural
 
    echo "newmtl $itemSecondColourName\n";
    echo "Ka 0.85 0.85 0.85\n";
    echo "Kd 0.75 0.75 0.75\n";
    echo "Ks 0.5 0.5 0.5\n";
    echo "Ns 2\n";
    echo "Ni 0.5\n";
    echo "illum 0\n";
    echo "sharpness 0\n";
    echo "map_Kd textures/$itemSecondColour.jpg$ver\n";
 
  } // End if $itemSecondColour is Natural
}  // End if $itemSecondColour 

if (!empty($itemThirdColour)) {
  echo "newmtl $itemThirdColour\n";
  echo "Ns 10.0000\n";
  echo "Ni 1.5000\n";
  echo "d 1.0000\n";
  echo "Tr 0.0000\n";
  echo "Tf 1.0000 1.0000 1.0000\n";
  echo "illum 2\n";
  echo "Ka 0.59 0.59 0.59\n";
  echo "Kd 0.59 0.59 0.59\n";
  echo "Ks 0.00 0.00 0.00\n";
  echo "Ke 0.00 0.00 0.00\n";
  echo "map_Kd textures/$itemThirdColour.jpg$ver\n";
}

if (!empty($itemFourthColour)) {
  echo "newmtl $itemFourthColour\n";
  echo "Ns 10.0000\n";
  echo "Ni 1.5000\n";
  echo "Tr 0.0000\n";
  echo "Tf 1.0000 1.0000 1.0000\n";
  echo "illum 2\n";
  echo "Ka 0.59 0.59 0.59\n";
  echo "Kd 0.59 0.59 0.59\n";
  echo "Ks 0.00 0.00 0.00\n";
  echo "Ke 0.00 0.00 0.00\n";
  echo "map_Kd textures/$itemFourthColour.jpg$ver\n";
}

if (!empty($itemUnderColour)) {
  echo "newmtl $itemUnderColour\n";
  echo "Ns 50\n";
  echo "Ka 0.150000 0.15000 0.15000\n";
  echo "Kd 0.150000 0.15000 0.15000\n";
  echo "illum 1\n";
}

if (!empty($itemGlassColour)) {
  echo "newmtl $itemGlassColour\n";
  echo "Ns 100.0000\n";
  echo "Ni 1.5000\n";
  echo "Tr 0.7000\n";
  echo "Tf 0.3000 0.3000 0.3000\n";
  echo "illum 2\n";
  echo "Ka 0.5880 0.5880 0.5880\n";
  echo "Kd 0.5880 0.5880 0.5880\n";
  echo "Ks 0.0000 0.0000 0.0000\n";
  echo "Ke 0.0000 0.0000 0.0000\n";
  echo "map_Kd textures/$itemGlassColour.jpg$ver\n";
}

if (!empty($itemMetalColour)) { 

if (in_array($itemMetalColour, $dullmetal)) { 

    echo "newmtl $itemMetalColour\n";
    echo "Ka 0.12 0.12 0.12\n";
    echo "Kd 0.55 0.55 0.55\n";
    echo "Ks 0.05 0.05 0.05\n";
    echo "Tf 1.0 1.0 1.0\n";
    echo "illum 2\n";
    echo "Ns 20\n";
    echo "map_Kd textures/$itemMetalColour.jpg$ver\n";

  } else { // if cladded top check that banding colour is not decorative bronze or jet black. If they are change the mtl settings.  
  
    echo "newmtl $itemMetalColour\n";
    echo "Ka 0.18 0.18 0.18\n"; 
    echo "Kd 0.75 0.75 0.75\n"; 
    echo "Ks 0.22 0.22 0.22\n"; 
    echo "Tf 1.0 1.0 1.0\n"; 
    echo "illum 2\n"; 
    echo "Ns 50\n";
    echo "map_Kd textures/$itemMetalColour.jpg$ver\n";
  
  }
 
}

  echo "newmtl cream\n";
  echo "Ka 0.50000 0.5000 0.5000\n";
  echo "Kd 0.55000 0.55000 0.5500\n";
  echo "illum 1\n";

echo "newmtl $itemProfileColour\n";

if (in_array($itemColour, $fullVein)) {
  echo "Ka 0.85 0.85 0.85\n";
  echo "Kd 0.75 0.75 0.75\n";
  echo "Ks 0.5 0.5 0.5\n";
  echo "Ns 2\n";
  echo "Ni 0.5\n";
  echo "illum 0\n";
  echo "sharpness 0\n";
  echo "map_Kd textures/$itemColour-vein.jpg$ver\n";
} elseif (in_array($itemColour, $yellowProfile)) {
  echo "Ka 0.50000 0.5000 0.5000\n";
  echo "Kd 0.57000 0.5500 0.5200\n";
  echo "illum 1\n";
} elseif (in_array($itemColour, $greenProfile)) {
  echo "Ka 0.12 0.12 0.10\n";
  echo "Kd 0.22 0.24 0.18\n";
  echo "Ks 0.05 0.05 0.05\n";
  echo "Tf 1.0 1.0 1.0\n";
  echo "illum 2\n";
  echo "Ns 18\n";
} elseif (in_array($itemColour, $darkProfile)) {
  echo "Ka 0.30000 0.3000 0.3000\n";
  echo "Kd 0.250 0.250 0.250\n";
  echo "illum 1\n";
} elseif (in_array($itemColour, $warmProfile)) {
  echo "Ka 0.50000 0.5000 0.5000\n";
  echo "Kd 0.5200 0.5200 0.5000\n";
  echo "illum 1\n";
} else { // cream/white
  echo "Ka 0.50000 0.5000 0.5000\n";
  echo "Kd 0.5200 0.5200 0.5000\n";
  echo "illum 1\n";
}

echo "newmtl $itemMeshColour\n";
echo "Ka 0.40000 0.4000 0.4000\n";
echo "Kd 0.4000 0.4000 0.4000\n";
echo "illum 1\n";