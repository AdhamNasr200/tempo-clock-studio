# ⏱ Tempo — Clock Studio

A beautiful, fully interactive **analog + digital clock** built using nothing but **HTML5, CSS3, and Vanilla JavaScript**. No npm install, no framework, no backend, and no internet connection needed.

## 🚀 Run it

1. Extract the ZIP file.
2. Open `clock-studio/index.html` by double-clicking it **or** open the folder in VS Code and choose **Open with Live Server**.
3. Start using the customization panel on the right. Your preferences save automatically.

## ✨ Features

- **Analog / Digital:** Switch between moving clock hands and a digital display.
- **Dial design:** Classic, Minimal, and Chronograph watch faces.
- **Colors:** Five preset palettes plus an unlimited custom color picker.
- **Clock shape:** Round, soft-square, or square.
- **Appearance:** Dark studio and light studio.
- **Time zones:** Local device time, Cairo, UTC, London, New York, Tokyo, Dubai, and Mumbai.
- **Fine tuning:** Show/hide seconds, smooth hand movement, and 12/24-hour formatting.
- **Collections:** Three one-click design presets.
- **Extras:** Surprise Me, fullscreen clock, responsive mobile layout, and saved preferences.

## 🗂 Project structure

```text
clock-studio/
├── index.html   # UI elements, controls, and clock structure
├── style.css    # Layout, design system, watch drawing, and responsive rules
├── script.js    # Time logic, events, settings, localStorage, and DOM updates
└── README.md    # This guide
```

## 🧠 شرح الكود — بالمصري

### 1. `index.html`

ده هيكل المشروع. هتلاقي `watchShell` هو العنصر اللي جواه شكل الساعة، و`hourHand` و`minuteHand` و`secondHand` هي العقارب. لوحة الـ **Customize** عبارة عن أزرار واختيارات `input` و`select`، وكل واحد ليه `id` أو `data-*` يقدر الـ JavaScript يوصله.

**شوف:** `data-display`, `data-face`, `data-color`, `data-shape`, `data-preset`.

### 2. `style.css`

التصميم كله متعمل بـ CSS من غير صور أو مكتبات. الـ **Clock face** معمول بـ `border-radius` و`radial-gradient`، والعقارب بـ `position: absolute`، و`transform-origin: 50% 100%` بيخلّي العقرب يلف حوالين قاعدته.

الألوان الأساسية معمولة بـ **CSS Variables**:

```css
--accent: #ad8bff;
--accent-rgb: 173,139,255;
```

لما تغير اللون من لوحة التحكم، الـ JavaScript بيغير المتغيرات دي، وبالتالي شكل الساعة يتغير من غير ما نكتب تنسيق منفصل لكل لون.

### 3. `script.js` — أهم ملف للمذاكرة

اقرأ الدوال بالترتيب ده:

| Function | بتعمل إيه؟ |
|---|---|
| `init()` | نقطة بداية البرنامج: تنشئ علامات الساعة وتربط الأحداث وتشغّل التحديث. |
| `getTimeParts(now)` | تستخرج الساعات والدقائق والثواني للمنطقة الزمنية المختارة. |
| `tick()` | تحسب درجات العقارب وتحدث الوقت الرقمي المعروض. |
| `renderSettings()` | تطبق اختيارات المستخدم على الـ DOM والـ CSS. |
| `attachListeners()` | بتوصل الضغطات والتغييرات بالأفعال المناسبة. |
| `saveSettings()` / `loadSettings()` | تحفظ الإعدادات وتسترجعها باستخدام `localStorage`. |

### 4. حساب حركة العقارب

كل دائرة فيها **360 درجة**:

```js
secondDegrees = accurateSeconds * 6; // 360 / 60
minuteDegrees = accurateMinutes * 6; // 360 / 60
hourDegrees   = accurateHours * 30;  // 360 / 12
```

الدقائق بتدخل في حساب عقرب الساعات، والثواني بتدخل في حساب الدقائق، عشان الحركة تبقى دقيقة ومش مجرد قفزات كل دقيقة أو ساعة.

```js
hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
```

السطر ده بيغيّر زاوية العقرب على الشاشة. الـ CSS هو اللي بيرسم العقرب، والـ JS هو اللي بيحسب مكانه.

### 5. ليه `Date` و`setInterval`؟

- `new Date()` بيجيب الوقت الحالي من الجهاز.
- `Intl.DateTimeFormat` بيخلّينا نحسب الوقت في أي مدينة من المناطق المحددة.
- `setInterval(tick, 80)` بيحدّث عرض الساعة بشكل متكرر كل 80ms تقريبًا.
- كل مرة بنقرأ **الوقت الحقيقي** من جديد؛ مش بنزيد ثانية على عداد داخلي، فمش هيتراكم انحراف الوقت لو المتصفح وقف التحديث فترة.

### 6. الحفظ باستخدام `localStorage`

بعد كل تغيير في الإعدادات بنستخدم:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
```

وعند إعادة فتح الصفحة بنعمل `JSON.parse` للإعدادات المخزنة. لو المتصفح منع التخزين، الساعة هتفضل شغالة بس اختياراتك مش هتتحفظ.

## 🎯 تحديات تقدر تجربها بعد ما تفهمه

1. ضيف لون سادس جديد داخل `COLORS` وفي لوحة الألوان.
2. ضيف منطقة زمنية جديدة داخل قائمة `timezoneSelect`.
3. خلي خلفية المعاينة تتغير حسب وقت النهار.
4. اعمل زر لإخفاء عقرب الساعات.
5. أضف Clock Face جديد باسم `Roman` بأرقام رومانية.

## Notes

- Uses your device's current clock for local time. If the device time is incorrect, the local clock will be too.
- Some browsers may restrict fullscreen or saved settings on `file://` pages; **Live Server** is recommended if that happens.
- The clock is meant for learning UI development; it is not a laboratory-grade timing instrument.
