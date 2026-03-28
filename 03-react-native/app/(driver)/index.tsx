import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Linking, Share } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { startForegroundWatch, getCurrentLocation } from '../../services/locationService';
import { fetchDriverOrders, pushLocationToBackend } from '../../services/dataService';
import { getTrackAsiaTileUrl, getTrackAsiaRoute } from '../../services/trackAsiaService';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = Math.round(height * 0.22); // ~22% of screen

const STATUS_LABELS: Record<string, string> = {
  pending: '📋 Chờ xuất phát',
  moving: '🚛 Đang vận chuyển',
  arrived: '⛽ Đã đến trạm',
  unloading: '🔧 Đang bơm/xả',
  completed: '✅ Hoàn thành',
};


export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top || (Platform.OS === 'android' ? 24 : 44);
  const safeBottom = insets.bottom || (Platform.OS === 'android' ? 16 : 34);
  const router = useRouter();
  const { user } = useAuthStore();
  const MBT = process.env.MAPBOX_ACCESS_TOKEN;
  const VMK = process.env.VIETMAP_API_KEY;

  const {
    currentLocation, setCurrentLocation,
    routeCoordinates, addRouteCoordinate,
    activeTrip, setActiveTrip,
    trackAsiaRoute, setTrackAsiaRoute, routeDistance, routeTime,
    customStartPoint, customEndPoint, setCustomPoints,
  } = useTripStore();

  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<'connecting' | 'active' | 'lost'>('connecting');
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Khởi tạo GPS và Load Chuyến đi
  useEffect(() => {
    const init = async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: loc.timestamp,
        });
        setGpsStatus('active');
      }

      if (user?.userId) {
        const orders = await fetchDriverOrders(user.userId);
        if (orders && orders.length > 0) {
          const active = orders.find((o: any) => o.status !== 'completed') || null;
          setActiveTrip(active);
        }
      }
      setLoading(false);

      const sub = await startForegroundWatch((location) => {
        const { latitude, longitude, speed: spd, heading: hdg } = location.coords;
        setCurrentLocation({
          latitude, longitude,
          speed: spd, heading: hdg,
          timestamp: location.timestamp,
        });
        addRouteCoordinate({ latitude, longitude });
        setSpeed(spd ? Math.round(spd * 3.6) : 0);
        setHeading(hdg || 0);
        setGpsStatus('active');

        // ===== THE MISSING LINK: GỬI LÊN WEB =====
        // Lấy chuyến đi hiện tại từ State động (Không bị kẹt cache của useEffect)
        const currentActiveTrip = useTripStore.getState().activeTrip;
        if (currentActiveTrip?.id) {
          // Gửi thẳng Toạ độ mới này lên Database (Node.js API)
          pushLocationToBackend(currentActiveTrip.id, latitude, longitude);
        }
      });
      watchRef.current = sub;
    };

    init();
    return () => { watchRef.current?.remove(); };
  }, []);

  // Tự động lấy Route khi có cả StartPoint và EndPoint
  useEffect(() => {
    const fetchRoute = async () => {
      if (customStartPoint && customEndPoint) {
        const route = await getTrackAsiaRoute(
          customStartPoint.lat, customStartPoint.lng,
          customEndPoint.lat, customEndPoint.lng
        );
        if (route) {
          setTrackAsiaRoute(route.points, route.distance, route.time);
          // Fit bounds is handled by injectJavaScript below
        }
      } else if (currentLocation && activeTrip?.destinationLat && activeTrip?.destinationLng && !trackAsiaRoute) {
        // Tự fetch route cho chuyến đi đang hoạt động
        const route = await getTrackAsiaRoute(
          currentLocation.latitude, currentLocation.longitude,
          activeTrip.destinationLat, activeTrip.destinationLng
        );
        if (route) {
          setTrackAsiaRoute(route.points, route.distance, route.time);
        }
      }
    };
    fetchRoute();
  }, [customStartPoint, customEndPoint, activeTrip]);

  // Gửi dữ liệu xuống HTML (kèm safe area)
  useEffect(() => {
    if (webViewRef.current && currentLocation) {
      const payload = JSON.stringify({
        driver: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          heading: currentLocation.heading || 0,
        },
        start: customStartPoint,
        end: customEndPoint || (activeTrip?.destinationLat
          ? { lat: activeTrip.destinationLat, lng: activeTrip.destinationLng }
          : null),
        actual: routeCoordinates.map(p => [p.latitude, p.longitude]),
        fit: false,
        safeTop,
        safeBottom,
      });
      webViewRef.current.injectJavaScript(`window.updateMap('${payload}'); true;`);
    }
  }, [currentLocation, customStartPoint, customEndPoint, activeTrip, trackAsiaRoute, routeCoordinates, safeTop, safeBottom]);

  const centerOnMe = () => {
    if (currentLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if(typeof map !== 'undefined') map.setView([${currentLocation.latitude}, ${currentLocation.longitude}], 15);
        true;
      `);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:0900000000`);
  };

  const handleShare = async () => {
    if (!currentLocation) return;
    try {
      await Share.share({
        message: `Vị trí hiện tại: https://maps.track-asia.com/?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}`,
      });
    } catch { }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Đang lấy vị trí...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== FLOATING ROUTE CARD (Điểm Đi / Điểm Đến) ===== */}
      <View style={[styles.routeCard, { top: safeTop + 8 }]}>
        <View style={styles.routeCardInner}>
          {/* Điểm Đi */}
          <View style={styles.routeRow}>
            <View style={[styles.routeNodeDot, { backgroundColor: '#10b981' }]} />
            <TouchableOpacity
              style={styles.routeInputBox}
              onPress={() => router.push({ pathname: '/(driver)/location-search', params: { type: 'start' } })}
            >
              <Text style={customStartPoint ? styles.routeInputFilled : styles.routeInputPlaceholder} numberOfLines={1}>
                {customStartPoint?.name || activeTrip?.exportWarehouse || 'Chọn điểm đi...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Đường nối */}
          <View style={styles.routeConnector}>
            <View style={styles.routeConnectorLine} />
          </View>

          {/* Điểm Đến */}
          <View style={styles.routeRow}>
            <View style={[styles.routeNodeDot, { backgroundColor: '#ef4444' }]} />
            <TouchableOpacity
              style={styles.routeInputBox}
              onPress={() => router.push({ pathname: '/(driver)/location-search', params: { type: 'end' } })}
            >
              <Text style={customEndPoint ? styles.routeInputFilled : styles.routeInputPlaceholder} numberOfLines={1}>
                {customEndPoint?.name || activeTrip?.destination || 'Chọn điểm đến...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* GPS Status Dot */}
        <View style={styles.gpsIndicator}>
          <View style={[styles.gpsDotSmall, { backgroundColor: gpsStatus === 'active' ? '#10b981' : gpsStatus === 'connecting' ? '#f59e0b' : '#ef4444' }]} />
        </View>
      </View>

      {/* ===== NAVIGATION MAP (Google Maps/Grab Style) ===== */}
      <WebView
        ref={webViewRef}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={true}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        source={{
          html: `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#1a1a2e}
#map{width:100vw;height:100vh}

/* === TURN INSTRUCTION BANNER (top) === */
#turnBanner{display:none;position:fixed;top:0;left:0;right:0;z-index:1000;
  background:#1c6b3a;color:#fff;align-items:center;gap:14px;
  padding:12px 16px 10px;box-shadow:0 4px 20px rgba(0,0,0,.5)}
#turnBanner.on{display:flex}
#turnArrow{font-size:36px;min-width:44px;text-align:center;filter:drop-shadow(0 0 4px rgba(255,255,255,.3))}
#turnInfo{flex:1}
#turnDist{font-size:22px;font-weight:800;letter-spacing:-0.5px}
#turnStreet{font-size:14px;opacity:.9;margin-top:1px;font-weight:600}
#voiceBtn{background:rgba(255,255,255,.15);border:none;border-radius:50%;width:44px;height:44px;
  font-size:20px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}

/* === REROUTING INDICATOR === */
#rerouteMsg{display:none;position:fixed;top:90px;left:50%;transform:translateX(-50%);
  z-index:1001;background:#e67e00;color:#fff;border-radius:20px;padding:6px 18px;
  font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.3)}
#rerouteMsg.on{display:block}

/* === BOTTOM ETA BAR === */
#etaBar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:1000;
  background:#1e2133;color:#fff;flex-direction:row;align-items:center;
  padding:14px 20px 18px;gap:0;box-shadow:0 -2px 20px rgba(0,0,0,.4)}
#etaBar.on{display:flex}
#etaTime{font-size:28px;font-weight:900;color:#4ade80}
#etaUnit{font-size:13px;color:#4ade80;margin-left:4px;margin-top:6px}
#etaSep{width:1px;background:rgba(255,255,255,.2);height:36px;margin:0 16px}
#etaMeta{flex:1}
#etaDist{font-size:14px;color:#e2e8f0;font-weight:600}
#etaArrival{font-size:12px;color:#94a3b8;margin-top:2px}
#endNavBtn{background:#ef4444;border:none;border-radius:50%;width:44px;height:44px;
  font-size:20px;color:#fff;cursor:pointer;margin-left:8px}

/* === VỀ GIỮA BUTTON (exact screenshot style) === */
#btnCenter{position:fixed;bottom:90px;left:16px;z-index:1000;
  background:rgba(30,33,51,.92);border:none;border-radius:100px;
  padding:10px 18px;display:flex;align-items:center;gap:8px;
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.4);transition:transform .15s;
  backdrop-filter:blur(8px)}
#btnCenter:active{transform:scale(.93)}
#btnCenter svg{width:18px;height:18px;fill:#4ade80}
#btnCenter.hidden{display:none}

/* === RIGHT CONTROLS === */
#rightCtrl{position:fixed;right:14px;bottom:90px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.rBtn{background:rgba(30,33,51,.92);border:none;border-radius:50%;width:46px;height:46px;
  font-size:18px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 12px rgba(0,0,0,.3);backdrop-filter:blur(6px)}

/* === DRIVER ICON === */
.dw{position:relative;width:52px;height:52px}
.dp{position:absolute;inset:0;border-radius:50%;background:rgba(74,222,128,.25);animation:pu 1.8s infinite ease-out}
.dd{position:absolute;top:50%;left:50%;width:32px;height:32px;margin:-16px 0 0 -16px;
  background:#4f46e5;border-radius:50%;border:3px solid #fff;
  box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.da{font-size:15px;color:#fff;line-height:1}
@keyframes pu{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.8);opacity:0}}
</style>
</head>
<body>

<!-- Turn Instruction Banner -->
<div id="turnBanner">
  <div id="turnArrow">↑</div>
  <div id="turnInfo">
    <div id="turnDist">--</div>
    <div id="turnStreet">Đang tính đường...</div>
  </div>
  <button id="voiceBtn" onclick="toggleVoice()">🔊</button>
</div>

<!-- Rerouting -->
<div id="rerouteMsg">🔄 Đang tính lại đường...</div>

<div id="map"></div>

<!-- Bottom ETA -->
<div id="etaBar">
  <div id="etaTime">--</div><div id="etaUnit">phút</div>
  <div id="etaSep"></div>
  <div id="etaMeta">
    <div id="etaDist">-- km</div>
    <div id="etaArrival">Dự kiến đến: --:--</div>
  </div>
  <button id="endNavBtn" onclick="endNav()">✕</button>
</div>

<!-- Về giữa button -->
<button id="btnCenter" class="hidden" onclick="recenter()">
  <svg viewBox="0 0 24 24"><path d="M12 2L8 6h3v5H6V8l-4 4 4 4v-3h5v5H8l4 4 4-4h-3v-5h5v3l4-4-4-4v3h-5V6h3z"/></svg>
  Về giữa
</button>

<!-- Right controls -->
<div id="rightCtrl">
  <button class="rBtn" onclick="map.zoomIn()">+</button>
  <button class="rBtn" onclick="map.zoomOut()">−</button>
</div>

<script>
var MBT='${MBT}';
var VMK='${VMK}';

var map=L.map('map',{zoomControl:false,attributionControl:false,preferCanvas:true}).setView([20.844,106.688],15);
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token='+MBT,{tileSize:256}).addTo(map);

// State
var dPos=null,tracking=true,voiceOn=true,muted=false;
var routePts=[],routeInstr=[],curStep=0;
var routeL=null,actualL=L.polyline([],{color:'#4ade80',weight:5,opacity:.9}).addTo(map);
var destM=null,srcM=null;
var lastEndKey=null,rerouteCooldown=false;

// Map pan → show "Về giữa"
map.on('dragstart',function(){tracking=false;document.getElementById('btnCenter').classList.remove('hidden')});

function recenter(){
  if(dPos){map.flyTo(dPos,Math.max(map.getZoom(),15),{animate:true,duration:.7});}
  tracking=true;document.getElementById('btnCenter').classList.add('hidden');
}

function endNav(){
  document.getElementById('etaBar').classList.remove('on');
  document.getElementById('turnBanner').classList.remove('on');
  lastEndKey=null;routePts=[];routeInstr=[];
  if(routeL){map.removeLayer(routeL);routeL=null;}
}

// === ICONS ===
function mkDrv(hdg){return L.divIcon({className:'',html:'<div class="dw"><div class="dp"></div><div class="dd"><div class="da" style="transform:rotate('+hdg+'deg)">▲</div></div></div>',iconSize:[52,52],iconAnchor:[26,26]})}
function mkDest(){return L.divIcon({className:'',html:'<div style="width:34px;height:34px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:15px">📍</div></div>',iconSize:[34,40],iconAnchor:[17,40]})}
function mkSrc(){return L.divIcon({className:'',html:'<div style="width:24px;height:24px;background:#4ade80;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',iconSize:[24,24],iconAnchor:[12,12]})}
var drvM=L.marker([20.844,106.688],{icon:mkDrv(0),zIndexOffset:1000});

// === SIGN → ARROW ===
function signToArrow(s){
  var m={'-3':'↰','-2':'←','-1':'↖','0':'↑','1':'↗','2':'→','3':'↱','4':'⤵','5':'↑','-7':'⬆','6':'↩','7':'↪'};
  return m[String(s)]||'↑';
}

// === POLYLINE DECODE ===
function decPoly(s){var i=0,la=0,ln=0,c=[],sh=0,r=0,b,lc,loc,f=1e5;while(i<s.length){b=null;sh=0;r=0;do{b=s.charCodeAt(i++)-63;r|=(b&0x1f)<<sh;sh+=5}while(b>=0x20);lc=((r&1)?~(r>>1):(r>>1));sh=r=0;do{b=s.charCodeAt(i++)-63;r|=(b&0x1f)<<sh;sh+=5}while(b>=0x20);loc=((r&1)?~(r>>1):(r>>1));la+=lc;ln+=loc;c.push([la/f,ln/f])}return c}

// === DISTANCE lat/lng → meters ===
function dist(a,b){var R=6371e3,p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180,dp=(b[0]-a[0])*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180,x=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}

// === MIN DIST from point to polyline ===
function distToRoute(pos){if(!routePts.length)return 9999;var mn=9999;for(var i=0;i<routePts.length;i++){var d=dist(pos,routePts[i]);if(d<mn)mn=d}return mn}

// === FIND NEAREST STEP ===
function findStep(pos){if(!routeInstr.length)return 0;var best=0,bd=9999;for(var i=0;i<routeInstr.length;i++){if(!routeInstr[i].points)continue;var d=dist(pos,routeInstr[i].points[0]);if(d<bd){bd=d;best=i}}return best}

// === VOICE ===
function speak(txt){if(!voiceOn||muted)return;try{var u=new SpeechSynthesisUtterance(txt);u.lang='vi-VN';u.rate=1;u.pitch=1;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}

function toggleVoice(){voiceOn=!voiceOn;document.getElementById('voiceBtn').textContent=voiceOn?'🔊':'🔇'}

var lastSpokenStep=-1,spokenAt400=false,spokenAt100=false;

function checkInstruction(pos){
  if(!routeInstr.length)return;
  var si=findStep(pos);
  if(si>=routeInstr.length)return;
  var instr=routeInstr[si];
  var nextPt=instr.points?instr.points[0]:null;
  if(!nextPt)return;
  var d=dist(pos,nextPt);

  // Update banner
  var arrow=signToArrow(instr.sign);
  var street=instr.text||'Đi thẳng';
  var distTxt=d>1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m';
  document.getElementById('turnArrow').textContent=arrow;
  document.getElementById('turnDist').textContent=distTxt;
  document.getElementById('turnStreet').textContent=street;

  // Voice announcements
  if(si!==lastSpokenStep){lastSpokenStep=si;spokenAt400=false;spokenAt100=false;}
  if(d<420&&d>180&&!spokenAt400){spokenAt400=true;speak('Còn '+Math.round(d)+'mét, '+street);}
  if(d<120&&!spokenAt100){spokenAt100=true;speak(street);}
}

// === DRAW ROUTE ===
function drawRoute(fla,fln,tla,tln,silent){
  fetch('https://maps.vietmap.vn/api/route?api-version=1.1&apikey='+VMK+'&vehicle=car&point='+fla+','+fln+'&point='+tla+','+tln)
  .then(function(r){return r.json()}).then(function(data){
    if(!data.paths||!data.paths.length)return;
    var p=data.paths[0];
    var pts=decPoly(p.points);
    routePts=pts;

    // Parse instructions with point coords
    routeInstr=(p.instructions||[]).map(function(ins){
      var ip=pts[ins.interval&&ins.interval[0]||0];
      return Object.assign({},ins,{points:ip?[ip]:null});
    });
    curStep=0;

    if(routeL)map.removeLayer(routeL);
    routeL=L.polyline(pts,{color:'#4f6ef7',weight:8,opacity:.9}).addTo(map);

    // ETA
    var distKm=(p.distance/1000).toFixed(1);
    var mins=Math.round(p.time/60000);
    var now=new Date(Date.now()+p.time);
    var hh=now.getHours().toString().padStart(2,'0');
    var mm=now.getMinutes().toString().padStart(2,'0');
    document.getElementById('etaDist').textContent=distKm+' km còn lại';
    document.getElementById('etaTime').textContent=mins;
    document.getElementById('etaArrival').textContent='Dự kiến đến: '+hh+':'+mm;
    document.getElementById('etaBar').classList.add('on');
    document.getElementById('turnBanner').classList.add('on');

    document.getElementById('rerouteMsg').classList.remove('on');
    rerouteCooldown=false;

    if(!silent)speak('Đã tìm thấy tuyến đường. Khoảng cách '+distKm+' kilômét.');
  }).catch(function(){document.getElementById('rerouteMsg').classList.remove('on')});
}

// === UPDATE MAP (bridge from React Native) ===
var safeT=0,safeB=0;
function setSafeArea(st,sb){
  if(st===safeT&&sb===safeB)return;
  safeT=st;safeB=sb;
  var tb=document.getElementById('turnBanner');
  var rm=document.getElementById('rerouteMsg');
  var eb=document.getElementById('etaBar');
  var bc=document.getElementById('btnCenter');
  var rc=document.getElementById('rightCtrl');
  if(tb)tb.style.paddingTop=(12+st)+'px';
  if(rm)rm.style.top=(90+st)+'px';
  if(eb){eb.style.paddingBottom=(14+sb)+'px';}
  var above=Math.round(window.innerHeight*0.22)+sb+12;
  if(bc)bc.style.bottom=above+'px';
  if(rc)rc.style.bottom=above+'px';
}
window.updateMap=function(raw){
  try{
    var d=JSON.parse(raw);
    if(d.safeTop!=null||d.safeBottom!=null)setSafeArea(d.safeTop||0,d.safeBottom||0);
    if(d.driver){
      dPos=[d.driver.lat,d.driver.lng];
      var hdg=d.driver.heading||0;
      drvM.setLatLng(dPos).setIcon(mkDrv(hdg)).addTo(map);
      if(tracking)map.setView(dPos,map.getZoom()<14?15:map.getZoom(),{animate:true,duration:.4});
      if(d.actual&&d.actual.length>1)actualL.setLatLngs(d.actual);

      // Turn guidance
      checkInstruction(dPos);

      // === AUTO REROUTE ===
      if(routePts.length&&!rerouteCooldown&&lastEndKey){
        var deviation=distToRoute(dPos);
        if(deviation>65){
          rerouteCooldown=true;
          document.getElementById('rerouteMsg').classList.add('on');
          speak('Đang tính lại đường.');
          var ep=lastEndKey.split(',');
          setTimeout(function(){drawRoute(dPos[0],dPos[1],parseFloat(ep[0]),parseFloat(ep[1]),true)},800);
        }
      }
    }

    if(d.start){
      if(!srcM)srcM=L.marker([d.start.lat,d.start.lng],{icon:mkSrc()}).addTo(map);
      else srcM.setLatLng([d.start.lat,d.start.lng]);
    }

    if(d.end){
      var ek=d.end.lat+','+d.end.lng;
      if(!destM)destM=L.marker([d.end.lat,d.end.lng],{icon:mkDest()}).addTo(map);
      else destM.setLatLng(d.end.lat,d.end.lng);
      if(lastEndKey!==ek&&dPos){
        lastEndKey=ek;
        drawRoute(dPos[0],dPos[1],d.end.lat,d.end.lng,false);
      }
    }else{
      if(destM){map.removeLayer(destM);destM=null;}
      lastEndKey=null;routePts=[];routeInstr=[];
      if(routeL){map.removeLayer(routeL);routeL=null;}
      document.getElementById('etaBar').classList.remove('on');
      document.getElementById('turnBanner').classList.remove('on');
    }
  }catch(e){}
};
</script>
</body>
</html>`
        }}
      />

      {/* ===== NÚT THAO TÁC NHANH (Bên phải) ===== */}
      <View style={[styles.sideActions, { bottom: BOTTOM_SHEET_MIN + safeBottom + 12 }]}>
        <TouchableOpacity style={styles.sideBtn} onPress={handleCall}>
          <Ionicons name="call" size={22} color="#0f172a" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} onPress={handleShare}>
          <Ionicons name="share-social" size={22} color="#0f172a" />
        </TouchableOpacity>
        {activeTrip && (
          <TouchableOpacity style={[styles.sideBtn, { backgroundColor: '#4f46e5' }]} onPress={() => router.push('/(driver)/camera')}>
            <Ionicons name="camera" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.sideBtn} onPress={centerOnMe}>
          <Ionicons name="locate" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ===== SPEED BADGE ===== */}
      <View style={[styles.speedBadge, { bottom: BOTTOM_SHEET_MIN + safeBottom + 12 }]}>
        <Text style={styles.speedNumber}>{speed}</Text>
        <Text style={styles.speedUnit}>km/h</Text>
      </View>

      {/* ===== BOTTOM SHEET ===== */}
      <View style={[
        styles.bottomSheet,
        { minHeight: BOTTOM_SHEET_MIN + safeBottom, paddingBottom: safeBottom + 8 },
        sheetExpanded && { minHeight: Math.round(height * 0.42) + safeBottom },
      ]}>
        <TouchableOpacity style={styles.sheetHandle} onPress={() => setSheetExpanded(!sheetExpanded)}>
          <View style={styles.sheetHandleBar} />
        </TouchableOpacity>

        {/* ETA & Khoảng cách */}
        {routeDistance > 0 && (
          <View style={styles.etaRow}>
            <View style={styles.etaBox}>
              <Text style={styles.etaValue}>{(routeDistance / 1000).toFixed(1)} km</Text>
              <Text style={styles.etaLabel}>Khoảng cách</Text>
            </View>
            <View style={styles.etaDivider} />
            <View style={styles.etaBox}>
              <Text style={styles.etaValue}>{Math.round(routeTime / 60)} phút</Text>
              <Text style={styles.etaLabel}>Dự kiến</Text>
            </View>
          </View>
        )}

        {activeTrip ? (
          <View style={styles.sheetContent}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripIdText}>#{activeTrip.id?.toString().slice(0, 6)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{STATUS_LABELS[activeTrip.status] || '📋 Chờ xuất phát'}</Text>
              </View>
            </View>

            <Text style={styles.cargoText}>📦 {activeTrip.amount || '---'}L — {activeTrip.product || '---'}</Text>

            {sheetExpanded && (
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => router.push({ pathname: '/(driver)/trip-detail', params: { tripId: activeTrip.id } })}
              >
                <Text style={styles.detailBtnText}>XEM CHI TIẾT & CẬP NHẬT TRẠNG THÁI</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.sheetContent}>
            <View style={styles.noTripContainer}>
              <Ionicons name="cafe" size={28} color="#4f46e5" />
              <Text style={styles.noTripText}>Đang chờ lệnh</Text>
              <Text style={styles.noTripSubText}>Chọn Điểm Đi & Điểm Đến ở trên để xem chỉ đường.</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 12, fontSize: 16 },
  map: { flex: 1 },

  // ===== Route Card (Top) — uses dynamic safeTop =====
  routeCard: {
    position: 'absolute', left: 16, right: 16, zIndex: 10,
    backgroundColor: '#ffffff', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  routeCardInner: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeNodeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  routeInputBox: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  routeInputFilled: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  routeInputPlaceholder: { color: '#94a3b8', fontSize: 14 },
  routeConnector: { paddingLeft: 6, paddingVertical: 2 },
  routeConnectorLine: { width: 2, height: 14, backgroundColor: '#e2e8f0', marginLeft: 0 },
  gpsIndicator: { marginLeft: 12 },
  gpsDotSmall: { width: 12, height: 12, borderRadius: 6 },

  // ===== Speed Badge — dynamic bottom =====
  speedBadge: {
    position: 'absolute', left: 16,
    backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, flexDirection: 'row', alignItems: 'baseline',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  speedNumber: { color: '#4f46e5', fontSize: 26, fontWeight: '900' },
  speedUnit: { color: '#94a3b8', fontSize: 11, marginLeft: 3 },

  // ===== Side Actions — dynamic bottom =====
  sideActions: { position: 'absolute', right: 16, gap: 10 },
  sideBtn: {
    backgroundColor: '#ffffff', width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },

  // ===== Map Markers =====
  driverMarker: {
    backgroundColor: '#4f46e5', borderRadius: 20,
    padding: 6, borderWidth: 3, borderColor: '#ffffff',
    elevation: 8,
  },
  startMarker: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 4,
    borderWidth: 2, borderColor: '#10b981', elevation: 6,
  },
  destMarker: {
    backgroundColor: '#ef4444', borderRadius: 20,
    padding: 8, borderWidth: 3, borderColor: '#ffffff',
    elevation: 8,
  },

  // ===== Bottom Sheet — dynamic paddingBottom & minHeight =====
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 15,
  },
  bottomSheetExpanded: {},
  sheetHandle: { alignItems: 'center', paddingVertical: 10 },
  sheetHandleBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1' },
  sheetContent: { paddingHorizontal: 20 },

  etaRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 12 },
  etaBox: { flex: 1, alignItems: 'center' },
  etaValue: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  etaLabel: { color: '#64748b', fontSize: 12, marginTop: 2 },
  etaDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },

  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripIdText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  statusBadge: { backgroundColor: 'rgba(79,70,229,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#4f46e5', fontSize: 12, fontWeight: '700' },
  cargoText: { color: '#0f172a', fontSize: 15, fontWeight: '600' },

  detailBtn: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  detailBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  noTripContainer: { alignItems: 'center', paddingVertical: 8 },
  noTripText: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginTop: 8 },
  noTripSubText: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 4 },
});