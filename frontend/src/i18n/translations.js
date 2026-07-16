// DJAGA Translation System — English (en) and Bahasa Melayu (ms)

const translations = {
  // ─── Navigation ───
  'nav.feed': { en: 'Feed', ms: 'Suapan' },
  'nav.home': { en: 'Home', ms: 'Utama' },
  'nav.intelMap': { en: 'Intel Map', ms: 'Peta Intel' },
  'nav.profile': { en: 'Profile', ms: 'Profil' },

  // ─── Home Page ───
  'home.title': { en: 'DJAGA — Detect. Protect. Trust.', ms: 'DJAGA — Kesan. Lindung. Percaya.' },
  'home.alert': { en: 'new scam alerts in Kuala Lumpur today', ms: 'amaran penipuan baharu di Kuala Lumpur hari ini' },
  'home.viewAlerts': { en: 'View alerts', ms: 'Lihat amaran' },
  'home.subtitle': { en: 'Lindungi diri anda daripada penipuan digital', ms: 'Lindungi diri anda daripada penipuan digital' },
  'home.scanImage': { en: 'Scan Image', ms: 'Imbas Imej' },
  'home.scanMessage': { en: 'Scan Message', ms: 'Imbas Mesej' },
  'home.stopScams': { en: 'Stop Scams.', ms: 'Hentikan Penipuan.' },
  'home.protectMalaysia': { en: 'Protect Malaysia.', ms: 'Lindungi Malaysia.' },
  'home.lostToScams': { en: 'Lost to scams', ms: 'Kerugian penipuan' },
  'home.affected': { en: 'Malaysians affected', ms: 'Rakyat terjejas' },
  'home.detection': { en: 'Detection', ms: 'Pengesanan' },
  'home.realtimeAi': { en: 'Real-time AI', ms: 'AI masa nyata' },
  'home.recentScans': { en: 'Recent Scans', ms: 'Imbasan Terkini' },
  'home.viewAll': { en: 'View all →', ms: 'Lihat semua →' },
  'home.scanNow': { en: 'Scan now', ms: 'Imbas sekarang' },

  // Home — Rotating Words
  'home.rotate.1': { en: 'Detect Deepfakes.', ms: 'Kesan Deepfake.' },
  'home.rotate.2': { en: 'Detect Scam Text.', ms: 'Kesan Teks Penipuan.' },
  'home.rotate.3': { en: 'Your AI Scams Preventer.', ms: 'Pencegah Penipuan AI Anda.' },
  'home.rotate.4': { en: 'Your Safe Place.', ms: 'Tempat Selamat Anda.' },

  // Home — Quick Actions
  'home.action.image.title': { en: 'Image Scanner', ms: 'Pengimbas Imej' },
  'home.action.image.desc': { en: 'Detect AI-generated faces and manipulated photos', ms: 'Kesan wajah janaan AI dan foto manipulasi' },
  'home.action.text.title': { en: 'Scam Check', ms: 'Semakan Penipuan' },
  'home.action.text.desc': { en: 'Check a message, link, phone number or bank account', ms: 'Semak mesej, pautan, nombor telefon atau akaun bank' },
  'home.action.voice.title': { en: 'Voice Deepfake Scanner', ms: 'Pengimbas Deepfake Suara' },
  'home.action.voice.desc': { en: 'Verify if audio is human or AI-generated', ms: 'Sahkan sama ada audio adalah manusia atau janaan AI' },
  'home.action.profile.title': { en: 'My Digital ID', ms: 'ID Digital Saya' },
  'home.action.profile.desc': { en: 'View your verified identity and trust score', ms: 'Lihat identiti dan skor kepercayaan anda' },

  // ─── Feed Page ───
  'feed.title': { en: 'Scam Intelligence Feed', ms: 'Suapan Perisikan Penipuan' },
  'feed.subtitle': { en: 'Live alerts from DJAGA community + PDRM + Semak Mule', ms: 'Amaran langsung dari komuniti DJAGA + PDRM + Semak Mule' },
  'feed.updated': { en: 'Updated 3 minutes ago', ms: 'Dikemaskini 3 minit lepas' },
  'feed.all': { en: 'All', ms: 'Semua' },
  'feed.critical': { en: 'Critical', ms: 'Kritikal' },
  'feed.high': { en: 'High', ms: 'Tinggi' },
  'feed.deepfake': { en: 'Deepfake', ms: 'Deepfake' },
  'feed.voice': { en: 'Voice', ms: 'Suara' },
  'feed.text': { en: 'Text', ms: 'Teks' },
  'feed.reportScam': { en: 'Report Scam', ms: 'Laporkan Penipuan' },
  'feed.reportTitle': { en: 'Report a Scam', ms: 'Laporkan Penipuan' },
  'feed.scamType': { en: 'Scam Type', ms: 'Jenis Penipuan' },
  'feed.description': { en: 'Description', ms: 'Penerangan' },
  'feed.descPlaceholder': { en: 'Describe the scam...', ms: 'Huraikan penipuan...' },
  'feed.phonePlaceholder': { en: "Scammer's phone or URL", ms: 'Telefon atau URL penipu' },
  'feed.phoneLabel': { en: 'Phone / Link (optional)', ms: 'Telefon / Pautan (pilihan)' },
  'feed.submitReport': { en: 'Submit Report', ms: 'Hantar Laporan' },
  'feed.reportSuccess': { en: 'Thank you! Report submitted for review.', ms: 'Terima kasih! Laporan dihantar untuk semakan.' },
  'feed.readMore': { en: 'Read more', ms: 'Baca lagi' },
  'feed.showLess': { en: 'Show less', ms: 'Kurangkan' },
  'feed.reports': { en: 'reports', ms: 'laporan' },
  'feed.verified': { en: 'PDRM Verified', ms: 'Disahkan PDRM' },
  'feed.noAlerts': { en: 'No alerts match this filter.', ms: 'Tiada amaran sepadan dengan penapis ini.' },
  'feed.severity.critical': { en: 'CRITICAL', ms: 'KRITIKAL' },
  'feed.severity.high': { en: 'HIGH', ms: 'TINGGI' },
  'feed.severity.medium': { en: 'MEDIUM', ms: 'SEDERHANA' },
  'feed.severity.low': { en: 'LOW', ms: 'RENDAH' },

  // ─── Image Scan Page ───
  'image.title': { en: 'Image Scanner', ms: 'Pengimbas Imej' },
  'image.subtitle': { en: 'Upload an image to check if it has been manipulated or AI-generated.', ms: 'Muat naik imej untuk semak jika ia dimanipulasi atau janaan AI.' },
  'image.tryDemo': { en: 'Or try a demo:', ms: 'Atau cuba demo:' },
  'image.realPhoto': { en: 'Real Photo', ms: 'Foto Sebenar' },
  'image.deepfake': { en: 'Deepfake', ms: 'Deepfake' },
  'image.groupPhoto': { en: 'Group Photo', ms: 'Foto Kumpulan' },
  'image.scanBtn': { en: 'Scan for Deepfakes', ms: 'Imbas untuk Deepfake' },
  'image.uploadHint': { en: 'Upload an image to begin', ms: 'Muat naik imej untuk bermula' },

  // ─── Text Scan Page ───
  'text.title': { en: 'Scam Message Scanner', ms: 'Pengimbas Mesej Penipuan' },
  'text.subtitle': { en: "Paste a suspicious message or URL to check if it's a scam.", ms: 'Tampal mesej atau URL mencurigakan untuk semak penipuan.' },
  'text.tryDemo': { en: 'Cuba contoh / Try an example:', ms: 'Cuba contoh:' },
  'text.scanBtn': { en: 'Scan Message', ms: 'Imbas Mesej' },
  'text.pasteHint': { en: 'Paste a message to begin', ms: 'Tampal mesej untuk bermula' },

  // ─── Voice Scan Page ───
  'voice.title': { en: 'Voice Deepfake Scanner', ms: 'Pengimbas Deepfake Suara' },
  'voice.subtitle': { en: 'Record or upload audio to detect AI-generated voices.', ms: 'Rakam atau muat naik audio untuk mengesan suara janaan AI.' },
  'voice.recordLive': { en: 'Record Live', ms: 'Rakam Langsung' },
  'voice.uploadAudio': { en: 'Upload Audio', ms: 'Muat Naik Audio' },
  'voice.recording': { en: 'Recording...', ms: 'Merakam...' },
  'voice.recordReady': { en: 'Recording ready', ms: 'Rakaman siap' },
  'voice.tapRecord': { en: 'Tap to record', ms: 'Ketuk untuk merakam' },
  'voice.audioLoaded': { en: 'Audio file loaded', ms: 'Fail audio dimuatkan' },
  'voice.clickUpload': { en: 'Click to upload audio file', ms: 'Klik untuk muat naik fail audio' },
  'voice.tryDemo': { en: 'Or try a demo:', ms: 'Atau cuba demo:' },
  'voice.realVoice': { en: 'Real Voice', ms: 'Suara Sebenar' },
  'voice.aiVoice': { en: 'AI Voice', ms: 'Suara AI' },
  'voice.analyseBtn': { en: 'Analyse Voice', ms: 'Analisis Suara' },

  // ─── Profile Page ───
  'profile.title': { en: 'My Digital Identity', ms: 'Identiti Digital Saya' },
  'profile.digitalId': { en: 'Digital ID Card', ms: 'Kad ID Digital' },
  'profile.trustScore': { en: 'Trust Score Breakdown', ms: 'Pecahan Skor Kepercayaan' },
  'profile.govCheck': { en: 'Government Verifications', ms: 'Pengesahan Kerajaan' },

  // ─── Intel Map Page ───
  'map.title': { en: 'Scam Intelligence Map', ms: 'Peta Perisikan Penipuan' },
  'map.subtitle': { en: 'Live scam heatmap across Malaysia — powered by DJAGA AI', ms: 'Peta haba penipuan langsung seluruh Malaysia — dikuasakan oleh DJAGA AI' },
  'map.aiInsights': { en: 'AI Insights', ms: 'Wawasan AI' },
  'map.poweredBy': { en: 'Powered by DJAGA Intelligence Engine', ms: 'Dikuasakan oleh Enjin Perisikan DJAGA' },
  'map.analysed': { en: 'Analysed 3,241 data points today', ms: '3,241 titik data dianalisis hari ini' },
  'map.reportsToday': { en: 'Reports today', ms: 'Laporan hari ini' },
  'map.activeAlerts': { en: 'Active alerts', ms: 'Amaran aktif' },
  'map.newToday': { en: 'New today', ms: 'Baru hari ini' },
  'map.mostAffected': { en: 'Most affected', ms: 'Paling terjejas' },
  'map.aiScans': { en: 'AI scans today', ms: 'Imbasan AI hari ini' },
  'map.allTypes': { en: 'All Types', ms: 'Semua Jenis' },
  'map.heatmap': { en: 'Heatmap', ms: 'Peta Haba' },
  'map.markers': { en: 'Markers', ms: 'Penanda' },
  'map.intensity': { en: 'Intensity', ms: 'Keamatan' },
  'map.mostAffectedCities': { en: 'Most Affected Cities', ms: 'Bandar Paling Terjejas' },
  'map.reports': { en: 'reports', ms: 'laporan' },
  'map.affected': { en: 'affected', ms: 'terjejas' },
  'map.readMore': { en: 'Read more ↓', ms: 'Baca lagi ↓' },
  'map.showLess': { en: '↑ Show less', ms: '↑ Kurangkan' },
  'map.lastUpdated': { en: 'Last updated:', ms: 'Terakhir dikemaskini:' },
  'map.ago': { en: 'ago', ms: 'lepas' },

  // ─── Common ───
  'common.threat': { en: 'THREAT', ms: 'ANCAMAN' },
  'common.safe': { en: 'SAFE', ms: 'SELAMAT' },
  'common.reportDownloaded': { en: 'Report downloaded successfully.', ms: 'Laporan berjaya dimuat turun.' },
  'common.shareCopied': { en: 'Share link copied to clipboard.', ms: 'Pautan kongsi disalin.' },
  'common.pdfDownloaded': { en: 'PDF downloaded successfully.', ms: 'PDF berjaya dimuat turun.' },
  'common.identityRefreshed': { en: 'Identity refreshed.', ms: 'Identiti disegarkan.' },

  // ─── Splash Screen ───
  'splash.tagline': { en: 'Detect · Protect · Trust', ms: 'Kesan · Lindung · Percaya' },
  'splash.version': { en: 'v2.0 · Digital Guardian for Malaysia', ms: 'v2.0 · Penjaga Digital untuk Malaysia' },
};

export default translations;
