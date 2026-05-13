import type { AppLanguage } from '@/context/AuthContext';

type InventoryLike = {
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  unit?: string | null;
  code?: string | null;
  type?: 'RETURNABLE' | 'CONSUMABLE' | string | null;
};

const INVENTORY_TEXT_EN: Record<string, string> = {
  'معدات التدريب الأمني والدفاعي': 'Security and Defense Training Equipment',
  'الإسعافات الأولية والسلامة': 'First Aid and Safety',
  'الواقع الافتراضي والتصوير والمحاكاة': 'Virtual Reality, Imaging, and Simulation',
  'الأجهزة التقنية والحاسب': 'Technical and Computer Devices',
  'التجهيزات التدريبية والقاعة': 'Training Room Equipment',
  'الأدوات الرياضية والتدريب البدني': 'Sports and Physical Training Tools',
  'القرطاسية والمواد المكتبية': 'Stationery and Office Supplies',
  'الهويات والشهادات والمطبوعات': 'IDs, Certificates, and Printed Materials',

  'معدات دفاع وتدريب تكتيكي': 'Defensive and Tactical Training Equipment',
  'معدات حماية شخصية': 'Personal Protective Equipment',
  'أسلحة تدريبية': 'Training Weapons',
  'أدوات ضبط وتقييد': 'Restraint and Control Tools',
  'حقائب ومحاكاة إسعافية': 'First Aid Bags and Simulation',
  'دمى ومحاكاة إسعافية': 'First Aid Manikins and Simulation',
  'معدات لياقة وتدريب بدني': 'Fitness and Physical Training Equipment',
  'أوزان رياضية': 'Training Weights',
  'حفظ وتنظيم': 'Filing and Organization',
  'دفاتر وملاحظات': 'Notebooks and Notes',
  'أدوات كتابة': 'Writing Supplies',
  'ملحقات تكتيكية': 'Tactical Accessories',
  'أنظمة واقع افتراضي': 'Virtual Reality Systems',
  'ملحقات واقع افتراضي': 'Virtual Reality Accessories',
  'ملحقات تصوير ومحاكاة': 'Imaging and Simulation Accessories',
  'حوامل وتجهيزات تصوير': 'Imaging Stands and Accessories',
  'حواسيب محمولة متخصصة': 'Specialized Laptops',
  'حواسيب محمولة': 'Laptops',
  'حواسيب مكتبية': 'Desktop Computers',
  'ملحقات تقنية': 'Technical Accessories',
  'وسائط تخزين': 'Storage Media',
  'وسائل عرض وتيسير': 'Display and Facilitation Tools',
  'أدوات تفتيش وفحص': 'Inspection and Search Tools',
  'ورق ومطبوعات': 'Paper and Printed Materials',
  'شهادات وأغلفة': 'Certificates and Covers',
  'بطاقات وتعريف': 'Cards and Identification',
  'مظاريف وحفظ': 'Envelopes and Filing',
  'مستلزمات مكتبية': 'Office Supplies',
  'مواد مكتبية مساعدة': 'Supporting Office Supplies',

  'قطعة': 'piece',
  'حبة': 'unit',
  'جهاز': 'device',
  'علبة': 'box',
  'مجموعة': 'set',
  'رزمة': 'ream',

  'ايباد': 'iPad',
  'آيباد': 'iPad',
  'ايباد بقلم': 'iPad with Pencil',
  'آيباد بقلم': 'iPad with Pencil',
  'لابتوب': 'Laptop',
  'لابتوبات التدريب': 'Training laptops',
  'لابتوب VR': 'VR laptop',
  'لابتوب تحقيق مواقع الحريق لينوفو': 'Lenovo fire scene investigation laptop',
  'أغلفة شهادات': 'Certificate covers',
  'اغلفة شهادات': 'Certificate covers',
  'أجهزة كمبيوتر ديل': 'Dell computers',
  'اجهزة كمبيوتر ديل': 'Dell computers',
  'أقلام': 'Pens',
  'اقلام': 'Pens',
  'أقلام سبورة': 'Whiteboard markers',
  'اقلام سبورة': 'Whiteboard markers',
  'براية أقلام رصاص': 'Pencil sharpener',
  'براية اقلام رصاص': 'Pencil sharpener',
  'تعليقة بطاقة': 'Badge lanyard',
  'أغلفة بطاقات': 'Card sleeves',
  'اغلفة بطاقات': 'Card sleeves',
  'ورق طباعة A4': 'A4 printing paper',
  'نوته': 'Notebook',
  'ملفات': 'Files',
  'ملفات دوكس فايل كبير': 'Large box files',
  'أقلام ليزر': 'Laser pointers',
  'قلم تحديد هاي لايت': 'Highlighter',
  'قلم رصاص': 'Pencil',
  'دبابيس دباسة': 'Staples',
  'دباسات': 'Staplers',
  'مسطرة': 'Ruler',
  'مساحة': 'Eraser',
  'مشابك كلبس أسود كبير': 'Large black binder clips',
  'مشابك كلبس أسود صغير': 'Small black binder clips',
  'مثلثات هندسية': 'Geometry triangles',
  'خرامة ورق': 'Paper punch',
  'صمغ': 'Glue',
  'ظرف كبير': 'Large envelope',
  'ظرف وسط': 'Medium envelope',
  'ظرف صغير': 'Small envelope',
  'ورق أصفر لاصق': 'Yellow sticky notes',
  'مغناطيس ألوان': 'Colored magnets',
  'فليب شارت': 'Flip chart',
  'سبورة فليب شارت': 'Flip chart board',

  'مصادات مائلة': 'Angled shields',
  'مصادات مستطيلة': 'Rectangular shields',
  'مصادات يد': 'Hand shields',
  'مصادات يد كبيرة': 'Large hand shields',
  'خوذة رأس': 'Helmet',
  'سترة حماية': 'Protective vest',
  'قفازة يد': 'Hand gloves',
  'مسدس': 'Training pistol',
  'جراب مسدس': 'Pistol holster',
  'حزام تكتيكي لحمل المسدس': 'Tactical pistol belt',
  'كلبشات': 'Handcuffs',
  'مفاتيح كلبشات': 'Handcuff keys',
  'سكين': 'Training knife',
  'عصا تدريب': 'Training baton',
  'فرش اسفنج تدريب': 'Training foam mats',
  'كشاف': 'Flashlight',
  'عصا فحص التفتيش': 'Inspection baton',
  'مراية فحص وتفتيش السيارات (شكل مستطيل)': 'Vehicle inspection mirror - rectangular',
  'مراية فحص وتفتيش السيارات (شكل دائري)': 'Vehicle inspection mirror - round',

  'شنطة دمية اسعافات أولية': 'First aid manikin bag',
  'شنطة إسعافات أولية': 'First aid bag',
  'كيس إسعافات أولية': 'First aid kit',
  'دمية تدريب دفاع عن النفس': 'Self-defense training manikin',
  'دمية اسعافات أولية': 'First aid manikin',
  'استاند تدريب البوكس': 'Boxing training stand',
  'حبل قفز': 'Jump rope',
  'ربطة شد الحبل': 'Resistance band',
  'أطباق 10 كيلو': '10 kg weight plates',
  'كيتل بل 4 كيلو': '4 kg kettlebell',

  'VR مجموعة': 'VR set',
  'نظارة VR': 'VR headset',
  'سماعة VR': 'VR headphones',
  'شنطة كبيرة VR': 'Large VR bag',
  'شنطة معدات تصوير VR': 'VR imaging equipment bag',
  'ستاند كاميرا': 'Camera stand',
  'كاميرا 360 انستا': 'Insta360 camera',
  'بطارية الكاميرا': 'Camera battery',
  'كرت حفظ بيانات نظارة VR': 'VR headset memory card',
  'كرت حفظ البيانات': 'Memory card',
  'حامل كرت حفظ البيانات': 'Memory card holder',
  'فلاش ميموري ساند ديسك': 'SanDisk flash drive',
  'فلاش ميموري انكر': 'Anker flash drive',
  'حامل فلاش ميموري اوريكو (عدد 4 فلاشات)': 'ORICO flash drive holder - 4 slots',
  'كيبل شاحن شنطة VR': 'VR bag charging cable',
  'كيبل شاحن لابتوب VR': 'VR laptop charging cable',
  'كيبل يو اس بي': 'USB cable',
  'مسند ثلاثي لحمل الكاميرا': 'Camera tripod',
  'ريموت': 'Remote control',
};

const ENGLISH_TO_ARABIC_ALIASES: Record<string, string[]> = {
  ipad: ['ايباد', 'آيباد', 'ايباد بقلم', 'آيباد بقلم'],
  'i pad': ['ايباد', 'آيباد', 'ايباد بقلم', 'آيباد بقلم'],
  laptop: ['لابتوب', 'لابتوبات التدريب', 'لابتوب VR'],
  laptops: ['لابتوب', 'لابتوبات التدريب', 'لابتوب VR'],
  'certificate cover': ['أغلفة شهادات', 'اغلفة شهادات'],
  'certificate covers': ['أغلفة شهادات', 'اغلفة شهادات'],
  certificates: ['أغلفة شهادات', 'شهادات وأغلفة'],
  pen: ['أقلام', 'اقلام', 'قلم رصاص'],
  pens: ['أقلام', 'اقلام', 'قلم رصاص'],
  marker: ['أقلام سبورة', 'اقلام سبورة'],
  markers: ['أقلام سبورة', 'اقلام سبورة'],
  whiteboard: ['أقلام سبورة', 'اقلام سبورة'],
  dell: ['أجهزة كمبيوتر ديل', 'اجهزة كمبيوتر ديل'],
  computer: ['أجهزة كمبيوتر ديل', 'اجهزة كمبيوتر ديل', 'حواسيب مكتبية'],
  computers: ['أجهزة كمبيوتر ديل', 'اجهزة كمبيوتر ديل', 'حواسيب مكتبية'],
  badge: ['تعليقة بطاقة', 'بطاقات وتعريف'],
  card: ['تعليقة بطاقة', 'أغلفة بطاقات', 'بطاقات وتعريف'],
  cards: ['تعليقة بطاقة', 'أغلفة بطاقات', 'بطاقات وتعريف'],
  paper: ['ورق طباعة A4', 'ورق ومطبوعات'],
  staples: ['دبابيس دباسة', 'دباسات'],
  stapler: ['دباسات'],
  ruler: ['مسطرة'],
  eraser: ['مساحة'],
  glue: ['صمغ'],
  envelope: ['ظرف كبير', 'ظرف وسط', 'ظرف صغير'],
  envelopes: ['ظرف كبير', 'ظرف وسط', 'ظرف صغير'],
  vr: ['VR مجموعة', 'نظارة VR', 'سماعة VR', 'لابتوب VR'],
  camera: ['كاميرا 360 انستا', 'ستاند كاميرا', 'بطارية الكاميرا'],
  usb: ['كيبل يو اس بي'],
  flash: ['فلاش ميموري ساند ديسك', 'فلاش ميموري انكر'],
};

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeEnglish(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const NORMALIZED_ARABIC_TO_ENGLISH = Object.entries(INVENTORY_TEXT_EN).reduce(
  (acc, [arabic, english]) => {
    acc[normalizeArabic(arabic)] = english;
    return acc;
  },
  {} as Record<string, string>
);

const NORMALIZED_ENGLISH_TO_ARABIC = Object.entries(INVENTORY_TEXT_EN).reduce(
  (acc, [arabic, english]) => {
    const normalized = normalizeEnglish(english);
    acc[normalized] = [...(acc[normalized] || []), arabic];
    return acc;
  },
  {} as Record<string, string[]>
);

export function normalizeInventoryLanguage(value?: string | null): AppLanguage {
  return String(value || '').toLowerCase() === 'en' ? 'en' : 'ar';
}

export function localizeInventoryText(value?: string | null, language: AppLanguage = 'ar') {
  const source = String(value || '').trim();
  if (!source || language !== 'en') return source;

  return INVENTORY_TEXT_EN[source] || NORMALIZED_ARABIC_TO_ENGLISH[normalizeArabic(source)] || source;
}

export function getInventoryTypeLabel(type?: string | null, language: AppLanguage = 'ar') {
  if (language === 'en') {
    return type === 'RETURNABLE' ? 'Returnable' : 'Consumable';
  }

  return type === 'RETURNABLE' ? 'مسترجعة' : 'استهلاكية';
}

export function getInventoryDisplayName(item?: InventoryLike | null, language: AppLanguage = 'ar') {
  return localizeInventoryText(item?.name, language) || (language === 'en' ? 'Material' : 'مادة');
}

export function getInventoryDisplayCategory(item?: InventoryLike | null, language: AppLanguage = 'ar') {
  return localizeInventoryText(item?.category, language);
}

export function getInventoryDisplaySubcategory(item?: InventoryLike | null, language: AppLanguage = 'ar') {
  return localizeInventoryText(item?.subcategory, language);
}

export function getInventoryDisplayUnit(item?: InventoryLike | null, language: AppLanguage = 'ar') {
  return localizeInventoryText(item?.unit, language);
}

export function getInventorySearchTerms(search?: string | null) {
  const source = String(search || '').trim();
  if (!source) return [];

  const terms = new Set<string>([source]);
  const normalizedEn = normalizeEnglish(source);
  const normalizedAr = normalizeArabic(source);

  for (const alias of ENGLISH_TO_ARABIC_ALIASES[normalizedEn] || []) {
    terms.add(alias);
  }

  for (const alias of NORMALIZED_ENGLISH_TO_ARABIC[normalizedEn] || []) {
    terms.add(alias);
  }

  const directEnglish = NORMALIZED_ARABIC_TO_ENGLISH[normalizedAr];
  if (directEnglish) {
    terms.add(directEnglish);
  }

  for (const [english, arabicValues] of Object.entries(ENGLISH_TO_ARABIC_ALIASES)) {
    if (normalizedEn.includes(english) || english.includes(normalizedEn)) {
      arabicValues.forEach((value) => terms.add(value));
    }
  }

  return [...terms].filter(Boolean);
}

export function getInventorySearchText(item?: InventoryLike | null, language: AppLanguage = 'ar') {
  if (!item) return '';

  const values = [
    item.name,
    item.code,
    item.category,
    item.subcategory,
    item.unit,
    localizeInventoryText(item.name, 'en'),
    localizeInventoryText(item.category, 'en'),
    localizeInventoryText(item.subcategory, 'en'),
    localizeInventoryText(item.unit, 'en'),
    getInventoryTypeLabel(item.type, language),
    getInventoryTypeLabel(item.type, 'en'),
  ];

  return values.filter(Boolean).join(' ');
}
