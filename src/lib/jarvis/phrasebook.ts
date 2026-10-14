/** Offline traveller phrasebook (native script + romanisation + BCP-47 voice code for text-to-speech). */
type Entry = [native: string, roman: string];
export const LANGS: Record<string, { code: string; label: string }> = {
  japanese: { code: "ja-JP", label: "Japanese" }, french: { code: "fr-FR", label: "French" }, thai: { code: "th-TH", label: "Thai" },
  spanish: { code: "es-ES", label: "Spanish" }, german: { code: "de-DE", label: "German" }, italian: { code: "it-IT", label: "Italian" },
  hindi: { code: "hi-IN", label: "Hindi" }, arabic: { code: "ar-SA", label: "Arabic" }, korean: { code: "ko-KR", label: "Korean" },
  mandarin: { code: "zh-CN", label: "Mandarin" }, chinese: { code: "zh-CN", label: "Mandarin" },
};

const P: Record<string, Record<string, Entry>> = {
  hello: {
    japanese: ["こんにちは", "Konnichiwa"], french: ["Bonjour", "bon-ZHOOR"], thai: ["สวัสดี", "Sawasdee (krub/ka)"], spanish: ["Hola", "OH-la"],
    german: ["Hallo", "HAH-lo"], italian: ["Buongiorno", "bwon-JOR-no"], hindi: ["नमस्ते", "Namaste"], arabic: ["مرحبا", "Marhaban"],
    korean: ["안녕하세요", "Annyeonghaseyo"], mandarin: ["你好", "Nǐ hǎo"],
  },
  "good morning": {
    japanese: ["おはようございます", "Ohayō gozaimasu"], french: ["Bonjour", "bon-ZHOOR"], thai: ["สวัสดีตอนเช้า", "Sawasdee ton chao"], spanish: ["Buenos días", "BWEH-nos DEE-as"],
    german: ["Guten Morgen", "GOO-ten MOR-gen"], italian: ["Buongiorno", "bwon-JOR-no"], hindi: ["सुप्रभात", "Suprabhat"], arabic: ["صباح الخير", "Sabah al-khair"],
    korean: ["좋은 아침이에요", "Joeun achimieyo"], mandarin: ["早上好", "Zǎoshang hǎo"],
  },
  "thank you": {
    japanese: ["ありがとうございます", "Arigatō gozaimasu"], french: ["Merci", "mair-SEE"], thai: ["ขอบคุณ", "Khop khun (krub/ka)"], spanish: ["Gracias", "GRAH-syas"],
    german: ["Danke", "DAHN-keh"], italian: ["Grazie", "GRAHT-tsyeh"], hindi: ["धन्यवाद", "Dhanyavaad"], arabic: ["شكرا", "Shukran"],
    korean: ["감사합니다", "Gamsahamnida"], mandarin: ["谢谢", "Xièxie"],
  },
  please: {
    japanese: ["お願いします", "Onegaishimasu"], french: ["S'il vous plaît", "seel voo PLEH"], thai: ["กรุณา", "Karuna"], spanish: ["Por favor", "por fa-VOR"],
    german: ["Bitte", "BIT-teh"], italian: ["Per favore", "per fa-VO-reh"], hindi: ["कृपया", "Kripya"], arabic: ["من فضلك", "Min fadlak"],
    korean: ["주세요", "Juseyo"], mandarin: ["请", "Qǐng"],
  },
  help: {
    japanese: ["助けて！", "Tasukete!"], french: ["Au secours !", "oh suh-KOOR"], thai: ["ช่วยด้วย", "Chuay duay"], spanish: ["¡Ayuda!", "a-YOO-da"],
    german: ["Hilfe!", "HIL-feh"], italian: ["Aiuto!", "a-YOO-to"], hindi: ["मदद कीजिए!", "Madad kijiye!"], arabic: ["ساعدني!", "Sa'idni!"],
    korean: ["도와주세요!", "Dowajuseyo!"], mandarin: ["救命！", "Jiùmìng!"],
  },
  "where is the toilet": {
    japanese: ["トイレはどこですか？", "Toire wa doko desu ka?"], french: ["Où sont les toilettes ?", "oo son lay twa-LET"], thai: ["ห้องน้ำอยู่ที่ไหน", "Hong nam yoo tee nai?"], spanish: ["¿Dónde está el baño?", "DON-deh es-TA el BA-nyo"],
    german: ["Wo ist die Toilette?", "vo ist dee toy-LET-teh"], italian: ["Dov'è il bagno?", "doh-VEH eel BAN-yo"], hindi: ["शौचालय कहाँ है?", "Shauchalay kahan hai?"], arabic: ["أين الحمام؟", "Ayna al-hammam?"],
    korean: ["화장실이 어디예요?", "Hwajangsiri eodiyeyo?"], mandarin: ["厕所在哪里？", "Cèsuǒ zài nǎlǐ?"],
  },
  "how much does this cost": {
    japanese: ["いくらですか？", "Ikura desu ka?"], french: ["C'est combien ?", "say kom-BYAN"], thai: ["เท่าไหร่", "Tao rai?"], spanish: ["¿Cuánto cuesta?", "KWAN-to KWES-ta"],
    german: ["Wie viel kostet das?", "vee feel KOS-tet das"], italian: ["Quanto costa?", "KWAN-to KOS-ta"], hindi: ["यह कितने का है?", "Yeh kitne ka hai?"], arabic: ["بكم هذا؟", "Bikam hatha?"],
    korean: ["얼마예요?", "Eolmayeyo?"], mandarin: ["多少钱？", "Duōshao qián?"],
  },
  "i need a doctor": {
    japanese: ["医者が必要です", "Isha ga hitsuyō desu"], french: ["J'ai besoin d'un médecin", "zhay buh-ZWAN dun mayd-SAN"], thai: ["ฉันต้องการหมอ", "Chan tong karn mor"], spanish: ["Necesito un médico", "ne-se-SEE-to un MEH-di-ko"],
    german: ["Ich brauche einen Arzt", "ikh BROW-kheh EYE-nen artst"], italian: ["Ho bisogno di un medico", "oh bee-ZON-yo dee oon MEH-dee-ko"], hindi: ["मुझे डॉक्टर चाहिए", "Mujhe doctor chahiye"], arabic: ["أحتاج إلى طبيب", "Ahtaju ila tabib"],
    korean: ["의사가 필요해요", "Uisaga piryohaeyo"], mandarin: ["我需要医生", "Wǒ xūyào yīshēng"],
  },
  "i am vegetarian": {
    japanese: ["私はベジタリアンです", "Watashi wa bejitarian desu"], french: ["Je suis végétarien(ne)", "zhuh swee vay-zhay-ta-RYAN"], thai: ["ฉันกินมังสวิรัติ", "Chan gin mangsawirat"], spanish: ["Soy vegetariano/a", "soy ve-he-ta-RYA-no"],
    german: ["Ich bin Vegetarier(in)", "ikh bin ve-ge-TAH-ree-er"], italian: ["Sono vegetariano/a", "SO-no ve-je-ta-RYA-no"], hindi: ["मैं शाकाहारी हूँ", "Main shakahari hoon"], arabic: ["أنا نباتي", "Ana nabati"],
    korean: ["저는 채식주의자예요", "Jeoneun chaesikjuuijayeyo"], mandarin: ["我吃素", "Wǒ chī sù"],
  },
  "call the police": {
    japanese: ["警察を呼んでください", "Keisatsu o yonde kudasai"], french: ["Appelez la police !", "a-play la po-LEES"], thai: ["เรียกตำรวจ", "Riak tamruat"], spanish: ["¡Llame a la policía!", "YA-meh a la po-lee-SEE-a"],
    german: ["Rufen Sie die Polizei!", "ROO-fen zee dee po-li-TSAI"], italian: ["Chiami la polizia!", "KYA-mee la po-lee-TSEE-a"], hindi: ["पुलिस को बुलाइए!", "Police ko bulaiye!"], arabic: ["اتصل بالشرطة!", "Ittasil bil-shurta!"],
    korean: ["경찰을 불러 주세요!", "Gyeongchareul bulleo juseyo!"], mandarin: ["请叫警察！", "Qǐng jiào jǐngchá!"],
  },
  "where is the train station": {
    japanese: ["駅はどこですか？", "Eki wa doko desu ka?"], french: ["Où est la gare ?", "oo ay la GAR"], thai: ["สถานีรถไฟอยู่ที่ไหน", "Sathani rot fai yoo tee nai?"], spanish: ["¿Dónde está la estación de tren?", "DON-deh es-TA la es-ta-SYON de tren"],
    german: ["Wo ist der Bahnhof?", "vo ist dair BAHN-hohf"], italian: ["Dov'è la stazione?", "doh-VEH la sta-TSYO-neh"], hindi: ["रेलवे स्टेशन कहाँ है?", "Railway station kahan hai?"], arabic: ["أين محطة القطار؟", "Ayna mahattat al-qitar?"],
    korean: ["기차역이 어디예요?", "Gichayeogi eodiyeyo?"], mandarin: ["火车站在哪里？", "Huǒchēzhàn zài nǎlǐ?"],
  },
};

const ALIASES: Record<string, string> = { hi: "hello", namaste: "hello", thanks: "thank you", toilet: "where is the toilet", bathroom: "where is the toilet", restroom: "where is the toilet", "how much": "how much does this cost", doctor: "i need a doctor", vegetarian: "i am vegetarian", police: "call the police", station: "where is the train station", "train station": "where is the train station" };

export function translatePhrase(phrase: string | undefined, language: string | undefined): { native: string; roman: string; voice: string; language: string; phrase: string } | null {
  if (!language) return null;
  const lang = language.toLowerCase();
  const meta = LANGS[lang];
  if (!meta) return null;
  const key = lang === "chinese" ? "mandarin" : lang;
  let p = (phrase || "hello").toLowerCase().replace(/[?.!]/g, "").trim();
  if (!P[p]) p = Object.keys(ALIASES).find((a) => p.includes(a)) ? ALIASES[Object.keys(ALIASES).find((a) => p.includes(a))!] : Object.keys(P).find((k) => p.includes(k) || k.includes(p)) ?? "";
  const e = P[p]?.[key];
  if (!e) return null;
  return { native: e[0], roman: e[1], voice: meta.code, language: meta.label, phrase: p };
}

export const SUPPORTED_PHRASES = Object.keys(P);
