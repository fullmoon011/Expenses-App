export interface CategoryDefinition {
  id: number;
  icon: string;
  rule: 'need' | 'want';
  names: string[];
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 0,
    icon: 'house',
    rule: 'need',
    names: [
      'کرێی خانوو یان قیست',
      'إيجار أو قسط السكن',
      'Rent / housing installment',
      'Kirê an qista xanî',
      'اجاره یا قسط مسکن',
      'Kira veya konut taksiti',
      'Miete / Wohnungsrate',
      'Loyer / mensualité logement',
      'Alquiler / hipoteca',
      'Аренда / ипотека',
      'Affitto / rata mutuo',
      'Hyra / boendekostnad',
      'Huur / hypotheek',
      '房租 / 房贷'
    ]
  },
  {
    id: 1,
    icon: 'zap',
    rule: 'need',
    names: [
      'کارەبا و مۆلیدە',
      'الكهرباء والمولدة',
      'Electricity & generator',
      'Elektrîk û jeneratore',
      'برق و ژنراتور',
      'Elektrik ve jeneratör',
      'Strom & Generator',
      'Électricité & groupe électrogène',
      'Electricidad y generador',
      'Электричество и генератор',
      'Elettricità e generatore',
      'El & generator',
      'Elektriciteit en generator',
      '电费与发电机'
    ]
  },
  {
    id: 2,
    icon: 'droplets',
    rule: 'need',
    names: [
      'ئاو',
      'الماء',
      'Water',
      'Av',
      'آب',
      'Su',
      'Wasser',
      'Eau',
      'Agua',
      'Вода',
      'Acqua',
      'Vatten',
      'Water',
      '水费'
    ]
  },
  {
    id: 3,
    icon: 'flame',
    rule: 'need',
    names: [
      'گاز و نەوت (گەرمکردنەوە)',
      'الغاز ونفط التدفئة',
      'Gas & heating fuel',
      'Gaz û mazot (germkirin)',
      'گاز و نفت گرمایش',
      'Gaz ve ısıtma yakıtı',
      'Gas & Heizung',
      'Gaz et chauffage',
      'Gas y calefacción',
      'Газ и отопление',
      'Gas e riscaldamento',
      'Gas & uppvärmning',
      'Gas en verwarming',
      '燃气与暖气'
    ]
  },
  {
    id: 4,
    icon: 'wifi',
    rule: 'need',
    names: [
      'ئینتەرنێت',
      'الإنترنت',
      'Internet',
      'Înternet',
      'اینترنت',
      'İnternet',
      'Internet',
      'Internet',
      'Internet',
      'Интернет',
      'Internet',
      'Internet',
      'Internet',
      '宽带网络'
    ]
  },
  {
    id: 5,
    icon: 'phone',
    rule: 'need',
    names: [
      'باڵانسی مۆبایل',
      'رصيد الهاتف',
      'Mobile balance',
      'Krediya mobîlê',
      'شارژ موبایل',
      'Telefon bakiyesi',
      'Mobilfunkguthaben',
      'Recharge mobile',
      'Saldo móvil',
      'Мобильная связь',
      'Ricarica cellulare',
      'Mobilabonnemang',
      'Mobiel tegoed',
      '话费充值'
    ]
  },
  {
    id: 6,
    icon: 'shopping-cart',
    rule: 'need',
    names: [
      'خۆراک و مارکێت',
      'المواد الغذائية والسوبرماركت',
      'Groceries & supermarket',
      'Xwarin û market',
      'خواربار و سوپرمارکت',
      'Market ve gıda',
      'Lebensmittel & Supermarkt',
      'Courses & supermarché',
      'Supermercado y comestibles',
      'Продукты и супермаркет',
      'Spesa alimentare',
      'Matvaror & stormarknad',
      'Boodschappen & supermarkt',
      '食品与生鲜超市'
    ]
  },
  {
    id: 7,
    icon: 'croissant',
    rule: 'need',
    names: [
      'نان و سەموون',
      'الخبز والصمون',
      'Bread & bakery',
      'Nan û fêkî',
      'نان و نانوایی',
      'Ekmek ve unlu mamuller',
      'Brot & Bäckerei',
      'Pain & boulangerie',
      'Pan y panadería',
      'Хлеб и выпечка',
      'Pane e forno',
      'Bröd & bageri',
      'Brood & bakkerij',
      '面包与烘焙'
    ]
  },
  {
    id: 8,
    icon: 'beef',
    rule: 'need',
    names: [
      'گۆشت و مریشک و ماسی',
      'اللحوم والدواجن والأسماك',
      'Meat, poultry & fish',
      'Goşt, mirîşk û masî',
      'گوشت، مرغ و ماهی',
      'Et, tavuk ve balık',
      'Fleisch, Geflügel & Fisch',
      'Viande, volaille & poisson',
      'Carne, pollo y pescado',
      'Мясо, птица и рыба',
      'Carne, pollame e pesce',
      'Kött, fågel & fisk',
      'Vlees, gevogelte & vis',
      '肉类、禽肉与海鲜'
    ]
  },
  {
    id: 9,
    icon: 'apple',
    rule: 'need',
    names: [
      'میوە و سەوزە',
      'الخضار والفواكه',
      'Fruits & vegetables',
      'Fêkî û sebze',
      'میوه و سبزیجات',
      'Meyve ve sebze',
      'Obst & Gemüse',
      'Fruits & légumes',
      'Frutas y verduras',
      'Фрукты и овощи',
      'Frutta e verdura',
      'Frukt & grönt',
      'Groenten & fruit',
      '水果与新鲜蔬菜'
    ]
  },
  {
    id: 10,
    icon: 'utensils',
    rule: 'want',
    names: [
      'چێشتخانە و خواردنی دەرەوە',
      'المطاعم والوجبات السريعة',
      'Restaurants & fast food',
      'Restoran û xwarina derve',
      'رستوران و فست‌فود',
      'Restoran ve dışarıda yemek',
      'Restaurants & Imbiss',
      'Restaurants & sorties',
      'Restaurantes y comida rápida',
      'Рестораны и фастфуд',
      'Ristoranti e take away',
      'Restaurang & utemat',
      'Restaurants & uit eten',
      '餐厅与外出就餐'
    ]
  },
  {
    id: 11,
    icon: 'fuel',
    rule: 'need',
    names: [
      'بنزین و سووتەمەنی',
      'البنزين والوقود',
      'Fuel & petrol',
      'Benzîn û sotemenî',
      'بنزین و سوخت',
      'Benzin ve yakıt',
      'Benzin & Kraftstoff',
      'Carburant & essence',
      'Combustible y gasolina',
      'Бензин и топливо',
      'Benzina e carburante',
      'Drivmedel & bensin',
      'Brandstof & benzine',
      '汽油与车辆燃油'
    ]
  },
  {
    id: 12,
    icon: 'car',
    rule: 'need',
    names: [
      'تەکسی و هاتوچۆ',
      'التاكسي والمواصلات',
      'Taxi & public transit',
      'Taksî û çûnûhatin',
      'تاکسی و حمل‌ونقل',
      'Taksi ve ulaşım',
      'Taxi & Nahverkehr',
      'Taxi & transports',
      'Taxi y transporte',
      'Такси и транспорт',
      'Taxi e trasporti',
      'Taxi & kollektivtrafik',
      'Taxi & openbaar vervoer',
      '出租车与公共交通'
    ]
  },
  {
    id: 13,
    icon: 'wrench',
    rule: 'need',
    names: [
      'چاککردنەوە و خزمەتگوزاریی ئۆتۆمبێل',
      'صيانة وخدمات السيارة',
      'Car maintenance & service',
      'Tamîr û lênêrîna erebeyê',
      'تعمیر و سرویس خودرو',
      'Araç bakım ve onarım',
      'Autoreparatur & Wartung',
      'Entretien & réparation auto',
      'Mantenimiento del coche',
      'Ремонт и обслуживание авто',
      'Manutenzione auto',
      'Bilservice & reparation',
      'Auto-onderhoud & reparatie',
      '汽车维修与保养'
    ]
  },
  {
    id: 14,
    icon: 'stethoscope',
    rule: 'need',
    names: [
      'پزیشک و دەرمان',
      'الأطباء والأدوية',
      'Doctor & medicines',
      'Bijîşk û derman',
      'پزشک و دارو',
      'Doktor ve ilaç',
      'Arzt & Medikamente',
      'Médecin & médicaments',
      'Médico y medicinas',
      'Врач и лекарства',
      'Medico e farmaci',
      'Läkare & medicin',
      'Dokter & medicijnen',
      '看病就医与药品'
    ]
  },
  {
    id: 15,
    icon: 'shirt',
    rule: 'want',
    names: [
      'جلوبەرگ و پێڵاو',
      'الملابس والأحذية',
      'Clothing & footwear',
      'Cil û berg û pêlav',
      'پوشاک و کفش',
      'Giyim ve ayakkabı',
      'Kleidung & Schuhe',
      'Vêtements & chaussures',
      'Ropa y calzado',
      'Одежда и обувь',
      'Abbigliamento e scarpe',
      'Kläder & skor',
      'Kleding & schoenen',
      '服装与鞋靴'
    ]
  },
  {
    id: 16,
    icon: 'scissors',
    rule: 'want',
    names: [
      'سەرتاشخانە و جوانکاری',
      'الحلاقة والعناية الشخصية',
      'Barber & personal care',
      'Kuafor û paqijî',
      'آرایشگاه و مراقبت شخصی',
      'Kuaför ve kişisel bakım',
      'Friseur & Körperpflege',
      'Coiffeur & soins personnels',
      'Peluquería y cuidado personal',
      'Парикмахер и уход',
      'Barbiere e cura personale',
      'Frisör & personlig vård',
      'Kapper & persoonlijke verzorging',
      '理发与个人护理'
    ]
  },
  {
    id: 17,
    icon: 'baby',
    rule: 'need',
    names: [
      'پێداویستیی منداڵ',
      'مستلزمات الأطفال',
      'Baby & kids essentials',
      'Pêdiviyên zarokan',
      'لوازم کودک و نوزاد',
      'Bebek ve çocuk ihtiyaçları',
      'Baby- & Kinderbedarf',
      'Bébé & enfants',
      'Bebés y niños',
      'Детские товары',
      'Articoli per bambini e neonati',
      'Barn & baby',
      'Baby- & kinderbenodigdheden',
      '母婴与儿童用品'
    ]
  },
  {
    id: 18,
    icon: 'graduation-cap',
    rule: 'need',
    names: [
      'خوێندن و قوتابخانە',
      'التعليم والمدارس',
      'Education & school',
      'Perwerde û dibistan',
      'آموزش و تحصیل',
      'Eğitim ve okul',
      'Bildung & Schule',
      'Éducation & scolarité',
      'Educación y colegio',
      'Образование и учеба',
      'Istruzione e scuola',
      'Utbildning & skola',
      'Onderwijs & school',
      '教育与学费书籍'
    ]
  },
  {
    id: 19,
    icon: 'hammer',
    rule: 'need',
    names: [
      'چاککردنەوەی ماڵ و پێداویستی',
      'صيانة المنزل والمستلزمات',
      'Home maintenance & supplies',
      'Tamîr û pêdiviyên malê',
      'تعمیرات و لوازم منزل',
      'Ev bakım ve gereçleri',
      'Haushaltsreparatur & Zubehör',
      'Entretien maison & équipement',
      'Mantenimiento del hogar',
      'Ремонт дома и хозтовары',
      'Manutenzione della casa',
      'Hemunderhåll & hushållsartiklar',
      'Woningonderhoud & benodigdheden',
      '家居维修与日用品'
    ]
  },
  {
    id: 20,
    icon: 'sparkles',
    rule: 'need',
    names: [
      'پاککەرەوە و ماددەی پاکوخاوێنی',
      'المنظفات ومواد التنظيف',
      'Cleaning supplies',
      'Madeyên paqijiyê',
      'شوینده و مواد بهداشتی',
      'Temizlik malzemeleri',
      'Reinigungsmittel',
      'Produits d’entretien',
      'Productos de limpieza',
      'Бытовая химия и уборка',
      'Prodotti per la pulizia',
      'Rengöringsmedel',
      'Schoonmaakartikelen',
      '清洁日化与洗涤用品'
    ]
  },
  {
    id: 21,
    icon: 'laptop',
    rule: 'want',
    names: [
      'ئامێری ئەلیکترۆنی و مۆبایل',
      'الإلكترونيات والأجهزة',
      'Electronics & gadgets',
      'Amûrên elektronîk',
      'لوازم الکترونیکی و موبایل',
      'Elektronik ve cihazlar',
      'Elektronik & Geräte',
      'Électronique & appareils',
      'Electrónica y dispositivos',
      'Электроника и гаджеты',
      'Elettronica e gadget',
      'Elektronik & prylar',
      'Elektronica & gadgets',
      '数码电子与智能设备'
    ]
  },
  {
    id: 22,
    icon: 'sofa',
    rule: 'want',
    names: [
      'مەتبەخ و کەلوپەلی ناوماڵ',
      'الأثاث ومستلزمات المطبخ',
      'Furniture & kitchenware',
      'Mobîlya û alavên metbexê',
      'مبلمان و لوازم آشپزخانه',
      'Mobilya ve mutfak eşyası',
      'Möbel & Küchenbedarf',
      'Meubles & cuisine',
      'Muebles y cocina',
      'Мебель и посуда',
      'Mobili e cucina',
      'Möbler & köksgeråd',
      'Meubels & keukengerei',
      '家具与厨房用具'
    ]
  },
  {
    id: 23,
    icon: 'gift',
    rule: 'want',
    names: [
      'دیاری و چاکەخوازی',
      'الهدايا والصدقات',
      'Gifts & donations',
      'Diyarî û xêrxwazî',
      'هدایا و کار خیر',
      'Hediye ve bağışlar',
      'Geschenke & Spenden',
      'Cadeaux & dons',
      'Regalos y donaciones',
      'Подарки и благотворительность',
      'Regali e donazioni',
      'Presenter & gåvor',
      'Cadeaus & donaties',
      '送礼人情与爱心捐款'
    ]
  },
  {
    id: 24,
    icon: 'palmtree',
    rule: 'want',
    names: [
      'گەشت و سەیران',
      'الرحلات والترفيه',
      'Trips & recreation',
      'Seyran û şahî',
      'سفر و تفریح',
      'Gezi ve eğlence',
      'Reisen & Freizeit',
      'Voyages & loisirs',
      'Viajes y ocio',
      'Поездки и отдых',
      'Viaggi e svago',
      'Resor & nöjen',
      'Reizen & recreatie',
      '旅游度假与休闲娱乐'
    ]
  },
  {
    id: 25,
    icon: 'coffee',
    rule: 'want',
    names: [
      'کافێ و قاوە و شیرینی',
      'المقاهي والحلويات',
      'Cafe, coffee & sweets',
      'Kafe û şîranî',
      'کافه، قهوه و شیرینی',
      'Kafe, kahve ve tatlı',
      'Café, Kaffee & Süßes',
      'Café & pâtisserie',
      'Cafetería y dulces',
      'Кафе, кофе и сладости',
      'Bar, caffè e dolci',
      'Kafé, kaffe & sötsaker',
      'Café, koffie & zoetigheden',
      '咖啡馆与甜品下午茶'
    ]
  },
  {
    id: 26,
    icon: 'dumbbell',
    rule: 'want',
    names: [
      'وەرزش و ئارەزووەکان',
      'الرياضة والهوايات',
      'Sports & hobbies',
      'Werzîş û hogirî',
      'ورزش و سرگرمی',
      'Spor ve hobiler',
      'Sport & Hobbys',
      'Sport & loisirs',
      'Deporte y aficiones',
      'Спорт и хобби',
      'Sport e hobby',
      'Sport & fritidsintressen',
      'Sport & hobby\'s',
      '体育健身与兴趣爱好'
    ]
  },
  {
    id: 27,
    icon: 'tv',
    rule: 'want',
    names: [
      'ئابوونە (نێتفلێکس، یوتوب...)',
      'الاشتراكات الشهرية',
      'Digital subscriptions',
      'Abonetiyên dîjîtal',
      'اشتراک‌های ماهانه',
      'Dijital abonelikler',
      'Digitale Abonnements',
      'Abonnements numériques',
      'Suscripciones digitales',
      'Подписки и сервисы',
      'Abbonamenti digitali',
      'Digitala prenumerationer',
      'Digitale abonnementen',
      '数字会员与流媒体订阅'
    ]
  },
  {
    id: 28,
    icon: 'shield',
    rule: 'need',
    names: [
      'بیمە و ڕسوومات',
      'التأمين والرسوم الحكومية',
      'Insurance & legal fees',
      'Bîme û rismên fermî',
      'بیمه و عوارض دولتی',
      'Sigorta ve resmi harçlar',
      'Versicherung & Gebühren',
      'Assurance & frais officiels',
      'Seguros y tasas',
      'Страховка и пошлины',
      'Assicurazioni e tasse',
      'Försäkring & avgifter',
      'Verzekering & heffingen',
      '保险与官方规费'
    ]
  },
  {
    id: 29,
    icon: 'credit-card',
    rule: 'need',
    names: [
      'دانەوەی قەرز',
      'سداد الديون',
      'Debt repayment',
      'Dayîna deynan',
      'بازپرداخت بدهی',
      'Borç geri ödemesi',
      'Schuldentilgung',
      'Remboursement de dettes',
      'Pago de deudas',
      'Погашение долгов',
      'Rimborso debiti',
      'Skuldbetalning',
      'Schuldaflossing',
      '偿还债务与借款'
    ]
  },
  {
    id: 30,
    icon: 'refresh-cw',
    rule: 'want',
    names: [
      'کۆمەڵەی پاشەکەوت (جەمعیە)',
      'صندوق الجمعية',
      'Rotating savings (Kumala)',
      'Komeleya teserûfê',
      'صندوق خانوادگی / قرعه‌کشی',
      'Altın günü birikimi',
      'Rotierender Sparverein',
      'Tontine d’épargne',
      'Círculo de ahorro rotativo',
      'Касса взаимопомощи',
      'Fondo di risparmio rotativo',
      'Roterande sparkassa',
      'Onderlinge spaarkring',
      '互助储蓄轮转合会'
    ]
  },
  {
    id: 31,
    icon: 'package',
    rule: 'want',
    names: [
      'خەرجی تر و جۆراوجۆر',
      'مصروفات أخرى ونثرية',
      'Other & miscellaneous',
      'Lêçûnên din',
      'سایر هزینه‌های متفرقه',
      'Diğer ve çeşitli giderler',
      'Sonstiges & Verschiedenes',
      'Autres & divers',
      'Otros y varios',
      'Прочие расходы',
      'Altro e varie',
      'Övrigt & diverse',
      'Overig & diversen',
      '其他与杂项支出'
    ]
  }
];

export const NEED_CATEGORY_IDS = CATEGORIES.filter(c => c.rule === 'need').map(c => c.id);

/**
 * Safe helper to retrieve category name in user language with robust fallbacks
 */
export const getCategoryName = (cat: CategoryDefinition | number | undefined, langIndex: number = 0): string => {
  if (cat === undefined) return '';
  const def = typeof cat === 'number' ? CATEGORIES[cat] : cat;
  if (!def || !def.names) return '';
  return def.names[langIndex] || def.names[2] || def.names[0] || '';
};
