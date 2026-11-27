/* 婚禮工作資料：人名只維護一次，各區塊透過穩定 ID 連結。 */
const weddingPeople = [
  ["guang-zhong", "光中"], ["zhu-yu-lin", "朱育麟"], ["shi-yan", "仕晏"],
  ["chen-zhen", "陳真"], ["zhen-hong", "振宏"], ["yuan-ting", "遠庭"], ["zeng-yi", "曾毅"],
  ["a-jie", "阿傑"], ["zhi-peng", "志鵬"], ["zhe-yuan", "哲元"], ["xiao-xuan", "小瑄"],
  ["qiong-zhi", "瓊之"], ["yu-tong", "雨彤"], ["ha-na", "哈娜"], ["ya-lin", "雅琳"],
  ["bi-fang", "碧芳"], ["yu-chen", "妤晨"], ["chen-xuan", "陳萱"], ["meng-xuan", "孟萱"],
  ["en-sheng", "恩生"], ["yun-xuan", "芸萱"], ["groom", "新郎"], ["meng-kai", "孟楷"],
  ["dexter", "Dexter"], ["wen-long", "文龍"], ["meng-ting", "孟婷"], ["hui-lin-bridal", "慧霖"],
  ["zi-yi", "子奕"], ["lin-pei-xian", "林沛賢"], ["you-lei", "友蕾"], ["xin-en", "信恩"],
  ["hui-ling", "慧玲"], ["hui-lin-interpreter", "慧琳"]
].map(([id, name]) => ({ id, name }));

const informationDeskMemberIds = ["wen-long", "meng-ting"];
const informationDeskStaff = informationDeskMemberIds
  .map((id) => weddingPeople.find((person) => person.id === id).name)
  .join("、");
const giftReferral = `賓客詢問禮物交給誰，或表示有準備送給新人的禮物時，請引導至聚會所後方的詢問處，由${informationDeskStaff}接收。`;
const giftDelivery = "婚禮結束後，將詢問處收到的禮物送回新娘家。";
const temporaryStorage = "指定暫存物品拆卸、整理及收納後，集中放在集會所適當位置，保持走道及出入口暢通，維持場地正常使用。";
const pickupDate = "2026 年 12 月 27 日（星期日）";
const pickupTime = "早上";
const pickupSummary = "由新郎、新娘自行前往集會所取回指定暫存物品。";
const receptionCarryTask = "攜帶指定照片及小物前往婚宴會場。";
const equipmentReturn = "借用設備依原有安排歸還，有特殊歸還需求時依原指定方式處理。";
const clearPhotoStage = "移走講桌、譜架、花藝及其他妨礙大合照的講台用品，完全清空講台區。";
const checkPhotoArea = "確認講台及前方拍照空間完全清空。";
const groupPhotoSetupSteps = [
  "引導前三排賓客移動，為親屬及有需要的賓客保留適當的等待座位。",
  "賓客移開後，撤除聚會所前三排椅子。",
  clearPhotoStage,
  checkPhotoArea
];
const groupPhotoShooting = "配合大合照主持人及攝影師友蕾。主持人召集下一組，招待員維持動線，確保新人於 16:30 離場。";
const groupPhotoCoordination = "由聚會所招待員主要執行，建議講台組協助。光中統籌，朱育麟協調招待員。";

const weddingData = {
  weddingInfo: {
    couple: "子靖＆勤萱", title: "婚禮工作指南", date: "2026 年 12 月 26 日",
    dateShort: "2026.12.26", weekday: "星期六", message: "謝謝大家協助我們完成這重要的一天。",
    ceremonyVenue: "王國聚會所", ceremonyAddress: "新竹縣竹東鎮長春路三段 376 號 2 樓",
    receptionVenue: "晶宴會館－御豐館", receptionHall: "星辰劇場"
  },
  keyTimes: [
    { time: "09:30", label: "工作人員抵達", scheduleId: "staff-arrival" },
    { time: "14:30", label: "婚禮正式開始", scheduleId: "ceremony-start" },
    { time: "16:30", label: "新人離場", scheduleId: "couple-leave" },
    { time: "17:15", label: "撤場完成", scheduleId: "cleanup-complete" }
  ],
  people: weddingPeople,
  management: [
    {
      role: "婚禮現場總招待", personId: "guang-zhong",
      duties: ["整體婚禮現場協調與主要問題處理窗口。", "掌握準備及撤場進度，與朱育麟、仕晏協調。", "協助胸花發放及上午拍照背板架設。", "統籌聚會所大合照場地轉換，負責 A 場地及走廊撤場確認。"],
      note: "招待員工作與站位由新人事前指定；不需由光中臨場從頭規劃。"
    },
    {
      role: "招待組負責人", personId: "zhu-yu-lin",
      duties: [
        "協調所有招待員及各崗位人力。",
        "發放工作人員胸章，視情況安排機動支援。",
        "與光中、仕晏保持聯繫。",
        "同時擔任集會所招待負責人。",
        "正式婚禮節目結束後，協調聚會所招待員轉換大合照場地。",
        "確認各區招待員都知道聚會所後方詢問處的位置，以及提供資訊、接收禮物的職責。",
        giftReferral
      ]
    },
    {
      role: "B 場地場控", personId: "shi-yan",
      duties: ["協調集會所現場及第二會場運作。", "協調甜點、背板區活動並處理現場問題。", "負責 B 場地撤場及復原確認。"]
    }
  ],
  schedule: [
    {
      id: "wedding-day", date: "12 月 26 日", title: "婚禮當日",
      events: [
        { id: "staff-arrival", time: "09:30–10:00", title: "工作人員陸續抵達", summary: "招待員 09:30 抵達即可，各組抵達後開始準備。", details: ["領取工作胸章。", "簡單清潔環境。", "協助椅子排列。", "按照組別開始布置。"], status: "confirmed", featured: true },
        { id: "setup-start", time: "10:00 起", title: "場地布置與設備架設", summary: "聚會所、集會所及走廊同步進行。", status: "confirmed" },
        { id: "rehearsal", time: "11:30 前", title: "完成進場彩排與直播測試", summary: "需在新娘化妝前完成，不必等待所有裝飾。", note: "11:00–11:20 為建議時段，正式時間仍可調整。", status: "tentative" },
        { id: "makeup", time: "11:30", title: "新娘開始化妝", summary: "新秘助手同步協助兩位媽媽化妝。", status: "confirmed" },
        { id: "lunch", time: "12:00–12:30 左右", title: "工作人員用餐", summary: "便當抵達後，全體工作人員一起用餐；時間保持彈性。", status: "tentative" },
        { id: "final-check", time: "13:00 起", title: "各組最後確認", summary: "檢查場地、影音、招待工作及婚禮用品，完成就位。", status: "confirmed" },
        { id: "guest-entry", time: "13:30", title: "現場賓客開始入場", summary: "花果空間送達甜點，甜點組接收並開放甜點與飲料。", note: "背板拍照是否同步提前開放仍待公布。", status: "confirmed" },
        { id: "zoom-open", time: "14:00", title: "Zoom 開放", summary: "新娘預計完成化妝及用餐；Zoom 持續播放婚紗輪播。", status: "confirmed", featured: true },
        { id: "ceremony-start", time: "14:30", title: "婚禮正式開始", summary: "依正式婚禮節目順序進行。", status: "confirmed", featured: true },
        { id: "ceremony-target", time: "15:15–15:20", title: "婚禮節目目標結束", summary: "目標於此時交接大合照主持人，實際時間以現場為準。", status: "tentative" },
        {
          id: "after-ceremony", time: "婚禮節目後", title: "大合照與自由活動",
          summary: "聚會所招待員引導前三排賓客移動、撤除前三排椅子並清空講台，再進行大合照。集會所開放背板拍照、甜點及照片列印。",
          details: [
            groupPhotoCoordination,
            ...groupPhotoSetupSteps,
            groupPhotoShooting,
            "集會所背板附近椅子撤除。",
            "賓客不必等待新人即可先在背板區拍照。",
            "線上播放成長影片及婚紗輪播。"
          ],
          note: "背板服務截止時間待公布；須預留足夠拆卸時間。",
          internalNote: "內部建議截止時間為 16:10，正式確認前不顯示。",
          status: "confirmed"
        },
        { id: "couple-leave", time: "16:30", title: "新人離場、背板撤收完成", summary: "新人必須離場；背板也須在此之前完成撤收。後續由各區負責人與工作人員處理。", status: "confirmed", featured: true },
        {
          id: "cleanup-complete", time: "17:15", title: "全部撤收、整理及復原完成",
          summary: "A 場地、B 場地及走廊完成撤收與復原。指定暫存物品妥善收納後，可留在集會所。",
          status: "confirmed", featured: true
        },
        { id: "staff-leave", time: "17:20", title: "剩餘工作人員最晚離場", summary: "已指定前往婚宴會場的人員可提早離開。", status: "confirmed" },
        { id: "reception-arrival", time: "17:50 前", title: "婚宴工作人員抵達", summary: "需參加婚宴者抵達會場；交通、停車及步行預估 20–30 分鐘。", status: "confirmed" },
        { id: "reception-start", time: "18:00", title: "婚宴正式開始", summary: "晶宴會館－御豐館・星辰劇場。", status: "confirmed" },
        { id: "send-off", time: "20:30", title: "預計送客", summary: "實際時間依現場流程為準。", status: "tentative" }
      ]
    },
    {
      id: "day-after", date: pickupDate, title: "婚禮隔天",
      events: [{
        id: "stored-items-pickup", time: pickupTime, title: "新人取回暫存物品",
        summary: pickupSummary, status: "confirmed"
      }]
    }
  ],
  assignments: [
    { personId: "a-jie", from: "集會所招待", trigger: "新娘進場", to: "手機直播機位 A", returnTo: "完成攝影後回到招待崗位" },
    { personId: "zhen-hong", from: "聚會所招待", trigger: "新娘進場", to: "手機直播機位 B", returnTo: "完成攝影後回到招待工作" },
    { personId: "meng-xuan", from: "甜點組", trigger: "照片列印服務開始", to: "照片列印", returnTo: "結束後依現場安排支援" },
    { personId: "bi-fang", from: "相片桌／花藝支援", trigger: "正式婚禮開始前", to: "婚禮手語傳譯", returnTo: "傳譯後依現場安排支援" }
  ],
  teams: [
    {
      id: "hall-a-ushers", name: "聚會所招待組", memberIds: ["chen-zhen", "zhen-hong", "yuan-ting", "zeng-yi"], status: "pending",
      periods: [
        { label: "上午準備", items: ["協助聚會所椅子搬運及排列。", "協助需要人力的場地布置。"] },
        { label: "賓客入場", items: ["引導入座，優先安排親屬及聾人保留座位。", "維持走道、入口暢通並協助需特別照顧的賓客。", "座位不足時引導至集會所。", giftReferral] },
        { label: "婚禮期間", items: ["婚誓前移除新人兩張座椅。", "振宏於新娘進場時轉為機位 B，其餘招待員暫時接替。"] },
        { label: "節目結束後｜大合照場地轉換", items: [groupPhotoCoordination, ...groupPhotoSetupSteps, groupPhotoShooting] },
        { label: "大合照後", items: ["配合 A 場地撤場及復原。"] }
      ], notes: ["婚誓前搬移新人座椅的確切招待員待公布。"]
    },
    {
      id: "hall-b-ushers", name: "集會所招待組", leaderId: "zhu-yu-lin", memberIds: ["zhu-yu-lin", "a-jie"], status: "confirmed",
      periods: [
        { label: "活動期間", items: ["接待賓客、協助第二會場座位並維持秩序。", "阿傑於新娘進場時負責機位 A，完成後回到招待崗位。", giftReferral] },
        { label: "節目結束後", items: ["移除背板附近椅子並集中堆疊。", "配合仕晏完成撤場。"] }
      ]
    },
    {
      id: "downstairs-ushers", name: "樓下招待組", memberIds: ["zhi-peng", "zhe-yuan"], status: "confirmed",
      periods: [{ label: "主要工作", items: ["協助抵達賓客並引導至二樓。", "提供方向及必要協助，配合朱育麟調度。", giftReferral] }]
    },
    {
      id: "chairs-stage", name: "聚會所椅子及講台組", memberIds: ["xiao-xuan", "qiong-zhi"], status: "confirmed",
      periods: [
        { label: "上午準備", items: ["協助椅子排列，設置講桌、新人座椅及手語區。", "確認講台配置符合指定位置。"] },
        {
          label: "節目結束後｜建議協助",
          items: ["配合光中統籌，支援聚會所招待員清空講台。", clearPhotoStage, checkPhotoArea]
        },
        { label: "撤場", items: ["正式大合照完成後，協助復原講台及座位配置。"] }
      ],
      notes: ["男性招待員及其他機動人員協助搬運。"]
    },
    { id: "floral", name: "花藝及裝飾組", memberIds: ["yu-tong", "ha-na", "ya-lin"], supportIds: ["bi-fang", "yu-chen"], status: "confirmed", periods: [{ label: "共同工作範圍", items: ["講桌、聚會所及部分椅背花藝。", "走廊中段牆面裝飾。", "視需要協助相片桌及甜點桌裝飾。", "婚禮後撤收裝飾。"] }], notes: ["碧芳、妤晨完成相片桌後加入；其他有空人員可協助。"] },
    {
      id: "photo-table", name: "相片桌組", memberIds: ["bi-fang", "yu-chen"], status: "confirmed",
      periods: [
        { label: "上午準備", items: ["在走廊靠近聚會所側設置相片桌。", "搬運、排列相片並完成桌面布置。", "完成後支援花藝組。"] },
        { label: "撤場", items: ["撤收相片桌及相關物品。", "指定送往婚宴會場的照片及小物，由婚宴先遣人員攜帶。"] }
      ],
      notes: ["碧芳正式婚禮期間負責手語傳譯，工作不可衝突。"]
    },
    { id: "dessert", name: "甜點組", memberIds: ["chen-xuan", "meng-xuan"], status: "pending", periods: [{ label: "上午", items: ["設置甜點桌、鋪設桌巾並完成裝飾。"] }, { label: "13:30", items: ["接收花果空間甜點，開放甜點及飲料。"] }, { label: "活動期間", items: ["補充甜點飲料、維持整潔，冷藏品使用保麗龍盒保存。", "照片列印開始後孟萱轉換崗位，陳萱留守甜點區。"] }, { label: "撤場", items: ["處理剩餘甜點、撤收用品並恢復場地。"] }], notes: ["機動支援人員如有需要再指定。"] },
    { id: "backdrop-setup", name: "拍照背板設置組", memberIds: ["en-sheng", "guang-zhong", "yun-xuan"], deadline: "16:30 前完成背板撤收", status: "confirmed", periods: [{ label: "上午", items: ["架設背板並確認穩定安全。", "配合攝影燈光，完成背板區準備。"] }, { label: "撤場", items: ["16:30 前完成背板撤收。"] }], notes: ["拆卸人員依當天人力調整，由仕晏協調。"] },
    { id: "photo-lighting", name: "攝影燈光設置", memberIds: ["groom", "meng-kai", "dexter"], status: "confirmed", periods: [{ label: "上午", items: ["架設背板攝影燈光、調整效果並試拍。", "確保燈架及線材安全。"] }, { label: "後續", items: ["新郎初設後由孟楷、Dexter 接續，活動後收拾設備。"] }] },
    {
      id: "information-desk", name: "詢問處", memberIds: informationDeskMemberIds, status: "confirmed",
      periods: [
        { label: "上午", items: ["在聚會所後方設桌並完成布置。"] },
        { label: "活動期間", items: ["回答賓客問題並提供相關資訊。", "接收賓客送給新人的禮物，妥善集中及保管。"] },
        { label: "婚禮後", items: [giftDelivery, "完成詢問處撤收及場地復原。"] }
      ],
      notes: ["送回新娘家的範圍僅限詢問處收到的禮物。", "桌布是否使用、禮物運送的確切時間待公布。"]
    },
    { id: "badges", name: "胸花及胸章發放", memberIds: ["guang-zhong", "groom", "zhu-yu-lin"], status: "confirmed", periods: [{ label: "婚禮開始前", items: ["光中、新郎負責胸花。", "朱育麟負責工作人員胸章。", "於工作人員抵達及婚禮開始前完成。"] }] },
    { id: "bridal-aid", name: "婚紗及婚禮用品協助", memberIds: ["hui-lin-bridal"], status: "confirmed", periods: [{ label: "婚禮期間", items: ["保管結婚戒指與婚誓麥克風，坐前排待命。", "新人上台後視需要整理婚紗。", "婚誓提供麥克風，交換戒指時遞交戒指。"] }], notes: ["新秘亦安排在前排。"] },
    { id: "av", name: "影音組", leaderId: "zi-yi", memberIds: ["zi-yi"], status: "confirmed", periods: [{ label: "上午", items: ["設置測試影音、麥克風、Zoom 與影片。", "確認機位編號並完成進場彩排。"] }, { label: "14:00", items: ["開放 Zoom，持續播放婚紗輪播。"] }, { label: "14:30 起", items: ["配合主席、播放進場音樂，依新娘位置切換焦點視訊。", "負責正式婚禮音控與影音。"] }, { label: "婚禮後", items: ["配合影片播放及設備撤收。"] }] },
    { id: "hall-b-av", name: "第二會場投影設備", memberIds: ["zi-yi", "meng-kai"], status: "pending", periods: [{ label: "上午", items: ["設置集會所筆電、投影機、投影幕及音響。", "確認 Zoom 畫面與聲音正常並完成測試。"] }, { label: "活動期間", items: ["正常後不需專人一直坐在電腦前；仕晏負責協調。"] }], notes: ["設備異常支援人員待公布。"] },
    { id: "livestream", name: "直播攝影組", memberIds: ["a-jie", "zhen-hong", "lin-pei-xian"], status: "confirmed", periods: [{ label: "機位", items: ["A：阿傑，集會所門口手機固定拍攝。", "B：振宏，聚會所門口手機拍攝走廊。", "C：林沛賢，Sony A7 III 拍進場、婚誓與戒指。", "D：聚會所固定攝影機，負責主要固定畫面。"] }], notes: ["本組為 Zoom 畫面，與紀錄攝影組不同。"] },
    { id: "documentary-photo", name: "紀錄攝影組", memberIds: ["you-lei", "xin-en"], status: "confirmed", periods: [{ label: "友蕾", items: ["聚會所婚禮紀錄、進場、婚誓、戒指及正式大合照。"] }, { label: "信恩", items: ["集會所跟拍、自然抓拍及賓客活動紀錄。"] }], notes: ["機動拍攝，避免長時間阻擋視線。"] },
    { id: "backdrop-photo-print", name: "背板拍照及照片列印", memberIds: ["meng-kai", "meng-xuan"], deadline: "16:30 前完成背板撤收", status: "pending", periods: [{ label: "孟楷｜背板攝影", items: ["引導賓客、確認構圖光線、拍照並交付列印。"] }, { label: "孟萱｜照片列印", items: ["接收照片、操作印表機、發放照片並補充耗材。"] }, { label: "服務原則", items: ["每組一張；賓客不必等待新人即可先拍照。"] }], notes: ["開始及停止時間待公布。", "內部準備約 200 張相紙。", "上午不安排新人與賓客合照。"] },
    { id: "group-photo-host", name: "大合照主持", memberIds: [], status: "pending", periods: [{ label: "主要工作", items: ["接過新郎麥克風並宣布拍照順序。", "召集人員並提醒下一組準備。", "配合友蕾與招待員，控制流程確保新人 16:30 離場。"] }], notes: ["主持人待公布；敬偉尚未確認，不列入名單。"] },
    { id: "sign-language", name: "手語傳譯", memberIds: ["bi-fang"], candidateIds: ["hui-ling", "hui-lin-interpreter"], status: "pending", periods: [{ label: "婚禮演講", items: ["碧芳負責手語傳譯。"] }, { label: "全體唱詩", items: ["詩歌傳譯人員於前排就座並配合。"] }], notes: ["詩歌傳譯姓名為慧玲／慧琳，待核對；不可與慧霖合併。", "固定攝影機不需為傳譯改變構圖。"] },
    { id: "lunch", name: "午餐安排", memberIds: ["groom"], status: "confirmed", periods: [{ label: "工作人員需知", items: ["便當抵達後，全體工作人員一起用餐。"] }], internalNote: "取餐招待員尚未指定，由現場協調。" }
  ],
  venues: [
    {
      id: "hall-a", name: "A 場地｜聚會所", capacity: "預計容納 120 人", purpose: "主要婚禮會場",
      items: [
        "手語區位於講台最左側。", "講桌位於中央偏左。", "新人兩張座椅位於講台右側。",
        `聚會所後方的詢問處由${informationDeskStaff}提供資訊、回答問題，並統一接收與保管送給新人的禮物。`,
        "賓客座位保留中央走道。"
      ],
      note: "椅子排列後再設置講台及花藝。"
    },
    { id: "corridor", name: "走廊", purpose: "連接聚會所與集會所", items: ["相片桌位於靠近聚會所的一側。", "中段牆壁設置簡單裝飾。", "保持動線暢通。"] },
    { id: "hall-b", name: "B 場地｜集會所", capacity: "預計容納 100–110 人", purpose: "第二會場、甜點及背板拍照區", items: ["第二會場投影區。", "甜點桌。", "拍照背板及攝影燈光區。", "照片列印區。", "新娘化妝小房間。"], note: "節目後由招待員移除背板附近椅子。撤場時可集中暫放指定物品，請保持走道及出入口暢通。" },
    { id: "entrance", name: "樓下入口及招待區", purpose: "賓客抵達引導", items: ["協助賓客確認方向。", "引導前往二樓會場。"] }
  ],
  seating: {
    orientation: "以賓客面向講台的方向為準",
    reserved: "座位區最左側、最靠左牆的四張椅子，連續前三排，共 12 席，保留給聾人賓客。",
    family: "前四排其餘座位優先安排親屬；不包含 12 席聾人保留座位。",
    general: "其餘座位供一般賓客使用。",
    removal: "正式婚禮節目後，先引導前三排賓客移動並安排等待座位，再撤除前三排椅子及完全清空講台。講台及前方空間合併供大合照使用。",
    disclaimer: "配置示意，非實際比例；椅子數量僅表達位置關係，不代表實際總數。"
  },
  ceremony: {
    start: "14:30", targetEnd: "15:15–15:20（目標時間）",
    items: [
      ["主席開場", "由新郎父親主持。"], ["主席宣布新娘進場"], ["新娘與父親走出小房間", "循環播放詩歌第 132 首。"],
      ["新娘與父親經走廊前往聚會所"], ["新郎迎接新娘"], ["新人一起走上講台"], ["整理婚紗", "慧霖及新秘視需要協助。"],
      ["新人就座"], ["婚禮演講", "新娘父親演講，碧芳手語傳譯。"], ["移除新人座椅", "確切招待員待公布。", "pending"],
      ["婚誓", "口語及手語進行；慧霖提供麥克風，林沛賢拍近景。"], ["交換戒指", "慧霖遞交戒指，攝影人員捕捉畫面。"],
      ["禱告", "由新娘父親負責；新人站立或就座待公布。", "pending"], ["介紹新人", "介紹人員待公布。", "pending"],
      ["全體唱詩第 132 首", "指定詩歌手語傳譯人員協助。"], ["新郎致謝", "並宣布甜點、背板拍照及大合照安排。"],
      ["交接大合照主持人", "主持人待公布。", "pending"], ["正式大合照及後續活動開始", "確認聚會所講台及前方拍照空間完全清空後開始拍攝。"]
    ].map(([title, detail = "", status = "confirmed"]) => ({ title, detail, status }))
  },
  cameraPositions: [
    { id: "A", operatorId: "a-jie", device: "手機", place: "集會所門口", work: "固定拍攝新娘與父親走出小房間，不跟隨移動。" },
    { id: "B", operatorId: "zhen-hong", device: "手機", place: "聚會所門口", work: "拍攝新娘與父親沿走廊前進。" },
    { id: "C", operatorId: "lin-pei-xian", device: "Sony A7 III 相機及電腦", place: "機動", work: "拍攝進場並跟拍至講台；婚誓及戒指時確保臉部與雙手完整入鏡。" },
    { id: "D", operator: "聚會所固定攝影機", device: "固定攝影機", place: "聚會所", work: "主要畫面、主席、婚禮演講及其他固定畫面。" }
  ],
  avCues: [
    ["14:00 Zoom 開放", "婚紗輪播", "播放影片及音訊"], ["主席開場", "固定機位 D", "主席麥克風"],
    ["新娘走出化妝室", "機位 A", "詩歌 132 循環播放"], ["新娘沿走廊前進", "機位 B", "持續播放詩歌"],
    ["新郎迎接新娘及新人上台", "機位 C", "持續播放詩歌"], ["新人就座", "固定機位 D", "適時停止背景音樂"],
    ["婚禮演講", "固定機位 D", "講者麥克風"], ["婚誓", "機位 C", "婚誓用無線麥克風"],
    ["交換戒指", "機位 C", "確保新人及戒指畫面"], ["禱告及介紹新人", "固定機位 D", "配合現場麥克風"],
    ["全體唱詩", "適合的現場畫面", "詩歌 132"], ["新郎致謝", "新郎畫面", "聚會所麥克風"],
    ["大合照開始後", "分享影片", "成長影片及婚紗輪播"]
  ].map(([moment, video, audio]) => ({ moment, video, audio })),
  avChecklist: [
    "所有直播機位事前加入 Zoom，使用 A、B、C、D 易辨識名稱。", "確認焦點視訊切換正常，供線上觀眾與集會所共同觀看。",
    "確認集會所接收畫面與主要會場音訊正常。", "避免移動機位麥克風與喇叭回授；集會所接收電腦關閉麥克風。",
    "確認影片分享包含聲音，Sony A7 III 與電腦連接正常。", "確認 Wi-Fi、電源穩定，線材不妨礙動線。"
  ],
  equipment: [
    "聚會所現有電腦：Zoom 主控及音控。", "林沛賢使用電腦：Sony A7 III 直播及後續影片播放（播放人員暫定）。",
    "集會所電腦：Zoom 接收及投影；至少需另借一台，另可準備一台備用。", "手機直播設備：機位 A、B。",
    "相片印表機及相紙、背板攝影燈光。", "婚誓用無線麥克風；譜架由勤萱攜帶。"
  ],
  photoGroups: {
    status: "pending", message: "合照分組及順序待公布", location: "聚會所",
    photographerId: "you-lei", host: "待公布", assistantTeamId: "hall-a-ushers",
    coordination: groupPhotoCoordination,
    steps: [...groupPhotoSetupSteps, groupPhotoShooting]
  },
  cleanup: {
    keyTimes: [{ time: "16:30", label: "新人離場、背板撤收完成" }, { time: "17:15", label: "全部撤收、整理及復原完成" }, { time: "17:20", label: "剩餘工作人員最晚離場" }],
    areas: [
      {
        name: "A 場地及走廊撤場", leaderId: "guang-zhong",
        items: [
          "大合照前，由光中統籌、朱育麟協調聚會所招待員撤除前三排椅子並完全清空講台，建議講台組協助。",
          clearPhotoStage,
          "大合照完成後，再恢復講桌、講台、新人座椅、手語區及椅子配置。",
          "撤除其餘場地及椅背花藝。",
          `${informationDeskStaff}撤收詢問處並復原場地。臨時影音及攝影設備由各組收拾。`,
          "撤收相片桌、走廊裝飾並清潔。",
          "各組撤收自己設置的物品，將指定暫存品整理後集中至集會所。"
        ],
        note: "由光中確認聚會所與走廊復原，並與仕晏協調指定物品暫存。"
      },
      {
        name: "B 場地撤場", leaderId: "shi-yan",
        items: [
          "收拾椅子、桌子、桌巾、甜點及相關物品。",
          "拆卸背板並撤收燈光、印表機與耗材。",
          "撤收筆電投影設備，整理化妝室。",
          "各組撤收自己設置的物品，清潔並復原場地。",
          temporaryStorage
        ],
        note: "背板 16:30 前收好。其餘撤收、整理及復原於 17:15 前完成，由仕晏確認。"
      }
    ],
    logistics: [
      { title: "詢問處收到的禮物", text: `婚禮結束後，由${informationDeskStaff}將詢問處收到的禮物送回新娘家。送回新娘家的範圍僅限這些禮物。`, status: "confirmed" },
      { title: "集會所暫存與隔天取回", text: `${temporaryStorage}${pickupDate}${pickupTime}，${pickupSummary}`, status: "confirmed" },
      { title: "婚宴照片及小物", text: `由指定的婚宴先遣人員${receptionCarryTask}`, status: "confirmed" },
      { title: "借用設備歸還", text: equipmentReturn, status: "confirmed" },
      { title: "最後確認", text: "光中、仕晏分別確認 A、B 場地；朱育麟協調招待員支援。", status: "confirmed" }
    ]
  },
  reception: {
    venue: "晶宴會館－御豐館", hall: "星辰劇場",
    times: [{ time: "17:00", label: "賓客入場" }, { time: "18:00", label: "婚宴正式開始" }, { time: "20:30", label: "預計送客", status: "tentative" }],
    advanceTeam: "待公布", advanceTasks: ["提前前往婚宴會場。", receptionCarryTask, "完成照片及小物布置。"],
    note: "其他婚宴詳細流程及人員安排後續補充。"
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = weddingData;
