/* ==========================================================================
   Stormworks エンジン＆足回りシミュレーター 【完全復元・解説付きJS】
   ========================================================================== */

// 🌐 【裏方処理】看板（Notice）を閉じる
function closeNotice() {
    document.getElementById('draggableNotice').style.display = 'none';
}

// 🎛️ 【裏方処理】看板のドラッグ移動機能（基本触らなくてOKです）
const notice = document.getElementById('draggableNotice');
const container = document.getElementById('mainContainer');
let isDragging = false;
let offsetX, offsetY;

notice.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('close-notice-btn')) return;
    isDragging = true;
    offsetX = e.clientX - notice.getBoundingClientRect().left;
    offsetY = e.clientY - notice.getBoundingClientRect().top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = container.getBoundingClientRect();
    let left = e.clientX - containerRect.left - offsetX;
    let top = e.clientY - containerRect.top - offsetY;
    const maxLeft = containerRect.width - notice.offsetWidth;
    const maxTop = containerRect.height - notice.offsetHeight;
    if (left < 0) left = 0; if (top < 0) top = 0;
    if (left > maxLeft) left = maxLeft; if (top > maxTop) top = maxTop;
    notice.style.left = left + 'px'; notice.style.top = top + 'px'; notice.style.right = 'auto';
});

document.addEventListener('mouseup', () => { isDragging = false; });


/* ==========================================================================
   【Aゾーン】 機体タイプ・動輪数・プロペラ数の「選択肢」のテンプレート
   ========================================================================== 
   🛠️ 画面の「〇軸推進」や「〇WD」といった選択肢の文字を増やしたり変えたりしたい場合はここ！ */
const layoutTemplates = {
    aero_rotor: {
        label: "🚁 ヘリコプター形式設定 (Helicopter Layout)",
        options: [
            { val: 'conventional', text: "通常型ヘリ (メイン1基 + テールローター1基自動合算 / Main + Tail)" },
            { val: '2', text: "二重反転 / タンデム型 (メインローター 2基 / Coaxial or Tandem)" },
            { val: '4', text: "クアッドローター型 (メインローター 4基 / Quad Rotors)" }
        ]
    },
    aero_prop: {
        label: "✈️ 航空機プロペラ基数設定 (Propeller Count)",
        options: [
            { val: '1', text: "単発機 (プロペラ 1基 / Single-Prop)" },
            { val: '2', text: "双発機 (プロペラ 2基 / Twin-Prop)" },
            { val: '3', text: "3発機 (プロペラ 3基 / Triple-Prop)" },
            { val: '4', text: "4発大型機 (プロペラ 4基 / Multi-Prop)" }
        ]
    },
    water_prop: {
        label: "⚓ 船舶スクリュー軸数設定 (Marine Screw Axles)",
        options: [
            { val: '1', text: "標準1軸推進 (スクリュー 1基 / Single Screw)" },
            { val: '2', text: "2軸推進 (左右2基掛け / Twin Screws)" },
            { val: '4', text: "大型4軸推進 (4基掛け / Quad Screws)" }
        ]
    },
    land: {
        label: "🚗 車両の駆動輪数設定 (Drive Wheels Setup)",
        options: [
            { val: '1', text: "駆動パーツ 1ペア (左右2輪駆動 / 2WD)" },
            { val: '2', text: "駆動パーツ 2ペア (左右4輪駆動 / 4WD / トレーラー後輪2軸)" },
            { val: '3', text: "駆動パーツ 3ペア (左右6輪駆動 / 6x6全輪駆動)" }
        ]
    }
};
layoutTemplates.track = layoutTemplates.land;
layoutTemplates.rail = layoutTemplates.land;


/* ==========================================================================
   【Bゾーン】 全パーツの性能マスターデータ（辞書）
   ========================================================================== 
   🛠️ パーツ自体の重さ(mass)、サイズ(radius)、トルクの係数などを打ち直したり、
   新しいタイヤ・エンジンを追加したい時はここをいじります。 */

// 1. エンジンの基本スペック（重さ、パワー係数、発熱係数、燃費係数）
const engineMaster = {
    std_small:  { isModular: false, mass: 30,  powerFactor: 1.2,  heatFactor: 0.08,  fuelFactor: 0.0015 },
    std_medium: { isModular: false, mass: 80,  powerFactor: 5.0,  heatFactor: 0.25,  fuelFactor: 0.0050 },
    std_large:  { isModular: false, mass: 400, powerFactor: 24.0, heatFactor: 1.10,  fuelFactor: 0.0240 },
    mod_1x1:    { isModular: true,  mass: 1,   powerFactor: 0.35, heatFactor: 0.025, fuelFactor: 0.00035 },
    mod_3x3:    { isModular: true,  mass: 11,  powerFactor: 3.20, heatFactor: 0.220, fuelFactor: 0.00310 },
    mod_5x5:    { isModular: true,  mass: 45,  powerFactor: 16.5, heatFactor: 1.150, fuelFactor: 0.01620 }
};

// 2. ラジエーターのスペック（重さ、冷却パワー）
const radSpecs = {
    rad3x3: { mass: 10, coolingPower: 1.2 },
    rad5x5: { mass: 25, coolingPower: 3.5 }
};

// 3. タイヤ・プロペラ・ローター類の全スペック（重さ、半径、負荷抵抗、最大駆動力、効率、所属カテゴリ）
const propSpecs = {
    wheel3:            { mass: 1.50,  radius: 0.375, baseLoadFactor: 0.060, maxForce: 8000,   efficiency: 1.0,   type: 'land' },
    wheel5:            { mass: 5.50,  radius: 0.625, baseLoadFactor: 0.120, maxForce: 22000,  efficiency: 1.0,   type: 'land' },
    wheel7:            { mass: 15.00, radius: 0.875, baseLoadFactor: 0.340, maxForce: 55000,  efficiency: 1.0,   type: 'land' },
    wheel9:            { mass: 25.00, radius: 1.125, baseLoadFactor: 0.520, maxForce: 110000, efficiency: 1.0,   type: 'land' }, 
    track_medium:      { mass: 20.00, radius: 0.500, baseLoadFactor: 0.450, maxForce: 65000,  efficiency: 0.88,  type: 'track' }, 
    train_med:         { mass: 10.00, radius: 0.350, baseLoadFactor: 0.012, maxForce: 50000,  efficiency: 0.98,  type: 'rail' },  
    marine_prop_s:     { mass: 1.50,  radius: 0.500, baseLoadFactor: 0.140, maxForce: 45000,  efficiency: 0.78,  type: 'water_prop' },
    marine_prop_m:     { mass: 3.00,  radius: 0.500, baseLoadFactor: 0.140, maxForce: 45000,  efficiency: 0.78,  type: 'water_prop' },
    marine_prop_l:     { mass: 14.00, radius: 0.500, baseLoadFactor: 0.140, maxForce: 45000,  efficiency: 0.78,  type: 'water_prop' },
    small_prop:        { mass: 0.50,  radius: 0.500, baseLoadFactor: 0.002, maxForce: 15000,  efficiency: 0.02,  type: 'aero_prop' }, 
    medium_prop:       { mass: 1.00,  radius: 0.875, baseLoadFactor: 0.005, maxForce: 40000,  efficiency: 0.02,  type: 'aero_prop' }, 
    aircraft_prop:     { mass: 2.00,  radius: 1.250, baseLoadFactor: 0.008, maxForce: 70000,  efficiency: 0.02,  type: 'aero_prop' }, 
    small_rotor:       { mass: 2.00,  radius: 1.500, baseLoadFactor: 0.015, maxForce: 20000,  efficiency: 0.015, type: 'aero_rotor' },
    medium_rotor:      { mass: 5.00,  radius: 2.500, baseLoadFactor: 0.025, maxForce: 70000,  efficiency: 0.015, type: 'aero_rotor' },
    large_rotor:       { mass: 10.00, radius: 3.500, baseLoadFactor: 0.035, maxForce: 150000, efficiency: 0.015, type: 'aero_rotor' },
    huge_rotor:        { mass: 20.00, radius: 4.500, baseLoadFactor: 0.045, maxForce: 250000, efficiency: 0.015, type: 'aero_rotor' }
};

// 4. 車体・機体の空気抵抗/水流抵抗ベース値
const dragSpecs = { low: 0.008, mid: 0.032, high: 0.085 };


/* ==========================================================================
   【Cゾーン】 画面の「パーツ選択」のドロップダウンを作る処理
   ========================================================================== 
   🛠️ 画面のセレクトボックス内に、新しいパーツの名前（文字）を表示させたい時は
   ここの HTML（<option>）の部分を増やしたり書き換えたりします。 */

function updatePropPartsOptions() {
    const category = document.getElementById('propCategory').value;
    const propSelect = document.getElementById('propType');
    const prevVal = propSelect.value;
    
    propSelect.innerHTML = ''; // 一旦リセット
    
    if (category === 'aviation') {
        propSelect.innerHTML = `
            <optgroup label="✈️ 航空プロペラ (Aircraft Props)">
                <option value="small_prop">Airplane Propeller S</option>
                <option value="medium_prop">Airplane Propeller M</option>
                <option value="aircraft_prop">Airplane Propeller L</option>
            </optgroup>
            <optgroup label="🚁 ヘリローター (Helicopter Rotors)">
                <option value="small_rotor">Huge Rotor S</option>
                <option value="medium_rotor">Huge Rotor M</option>
                <option value="large_rotor">Huge Rotor L</option>
                <option value="huge_rotor">Huge Rotor XL</option>
            </optgroup>
        `;
    } else if (category === 'marine') {
        propSelect.innerHTML = `
            <optgroup label="⚓ マリンスクリュー (Marine Propellers)">
                <option value="marine_prop_s">Marine Propeller S</option>
                <option value="marine_prop_m">Marine Propeller M</option>
                <option value="marine_prop_l">Marine Propeller L</option>
            </optgroup>
        `;
    } else if (category === 'ground') {
        propSelect.innerHTML = `
            <optgroup label="🚗 陸上用タイヤ (Wheels)">
                <option value="wheel3" selected>Wheel 3x3 (標準タイヤ)</option>
                <option value="wheel5">High Wheel 5x5</option>
                <option value="wheel7">Giant Wheel 7x7</option>
                <option value="wheel9">Giant Wheel XL 9x9</option>
            </optgroup>
            <optgroup label="⛓️ 履帯 ＆ 鉄道 (Tracks & Rails)">
                <option value="track_medium">Track (履帯全サイズ共通)</option>
                <option value="train_med">Train Wheel (鉄道車輪)</option>
            </optgroup>
        `;
    }
    
    // パーツを切り替えても選択が外れないようにする処理
    if (prevVal && propSelect.querySelector(`option[value="${prevVal}"]`)) {
        propSelect.value = prevVal;
    } else {
        propSelect.selectedIndex = 0;
    }
    updateLayoutOptions();
}

// 推進器に合わせて「動輪数」や「プロペラ枚数」の選択肢を自動生成する処理
function updateLayoutOptions() {
    const propType = document.getElementById('propType').value;
    if (!propType) return;
    const spec = propSpecs[propType] || propSpecs['wheel3'];
    const layoutSelect = document.getElementById('heliLayout');
    const layoutLabel = document.getElementById('layoutLabel');
    
    const template = layoutTemplates[spec.type];
    layoutLabel.innerText = template.label;
    
    const previousVal = layoutSelect.value;
    layoutSelect.innerHTML = '';
    
    template.options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.val;
        optionEl.text = opt.text;
        if (opt.val === previousVal) optionEl.selected = true;
        layoutSelect.appendChild(optionEl);
    });
    
    if (!layoutSelect.value && layoutSelect.options.length > 0) {
        layoutSelect.options[0].selected = true;
    }
}


/* ==========================================================================
   【Dゾーン】 リアルタイム物理計算の心臓部（計算メイン関数）
   ========================================================================== 
   🛠️ ストワの各種計算ロジック、数式そのものを変更したい場合はここから下を弄ります！ */

function updateSimulation() {
    // --- 1. 画面の入力フォームから現在の値（数値）をすべて取得する ---
    const eType = document.getElementById('engineType').value || 'std_medium';
    const eCount = parseInt(document.getElementById('engineCount').value);

    // エンジン数が0か空欄の時はストップ
    if (isNaN(eCount) || eCount <= 0) {
        document.getElementById('speedDisplay').innerText = "NO ENGINE";
        return;
    }
    const gearRatio = parseFloat(document.getElementById('gearRatio').value) || 1.0;
    const radType = document.getElementById('radType').value || 'rad3x3';
    const radCount = Math.max(1, parseInt(document.getElementById('radCount').value) || 1);
    const pumpType = document.getElementById('pumpType').value || 'none';
    const propType = document.getElementById('propType').value || 'wheel3';
    const heliLayout = document.getElementById('heliLayout').value || '1';
    const customMass = Math.max(0, parseFloat(document.getElementById('customMass').value) || 0);
    const dragType = document.getElementById('dragType').value || 'mid';
    const rps = parseFloat(document.getElementById('rps').value);
    const throttle = parseFloat(document.getElementById('throttle').value);

    // 画面のスライダー横にあるテキスト数字を更新
    document.getElementById('rpsVal').innerText = rps;
    document.getElementById('throttleVal').innerText = throttle.toFixed(2);

    // Bゾーンのデータ辞書から選ばれたパーツの数値を引っ張り出す
    const spec = engineMaster[eType];
    const rad = radSpecs[radType];
    const prop = propSpecs[propType] || propSpecs['wheel3'];
    const baseDrag = dragSpecs[dragType];

    // モジュールか既存エンジンかで画面の注釈テキストを切り替える
    const note = document.getElementById('cylinderNote');
    if (spec.isModular) {
        note.innerText = `※モジュラーエンジン：${eCount}気筒として計算中 (Modular Cylinder)`;
    } else {
        note.innerText = `※既存エンジン：同じエンジンを ${eCount}台並列で計算中 (Prefab Engine)`;
    }

    // タイヤの数やプロペラ数を計算用にカウント
    let propCount = parseInt(heliLayout) || 1;
    if (heliLayout === 'conventional') propCount = 1;

    // --- 2. 【計算】 合計質量の計算 ---
    let propMassTotal = prop.mass * propCount;
    if (heliLayout === 'conventional' && prop.type === 'aero_rotor') {
        propMassTotal += 1.0; // 通常ヘリならテールローター分の重量をちょっと加算
    }
    const totalMass = (spec.mass * eCount) + (rad.mass * radCount) + propMassTotal + customMass;
    document.getElementById('totalMass').innerText = totalMass.toFixed(1) + " (質量 / Mass)";

    // --- 3. 【計算】 エンジンの総発生最大トルク ---
    const enginePower = rps * throttle * eCount * spec.powerFactor;
    document.getElementById('totalPower').innerText = enginePower.toFixed(1) + " SW-Torque";

    // --- 4. 【計算】 各推進器ごとの逆流負荷(Nm) と 駆動力(N) の条件分岐計算 ---
    const propRPS = Math.abs(rps / gearRatio);
    let propLoadTorque = 0;
    let generatedForce = 0;

    if (prop.type === 'land') { // タイヤ
        propLoadTorque = prop.baseLoadFactor * propRPS;
        generatedForce = propRPS * throttle * (prop.maxForce / 25) * prop.efficiency;
    } else if (prop.type === 'track') { // 履帯
        propLoadTorque = prop.baseLoadFactor * (propRPS * 1.3);
        generatedForce = propRPS * throttle * (prop.maxForce / 18) * prop.efficiency;
    } else if (prop.type === 'rail') { // 鉄道車輪
        propLoadTorque = prop.baseLoadFactor * Math.pow(propRPS, 0.90);
        generatedForce = propRPS * throttle * (prop.maxForce / 20) * prop.efficiency;
    } else if (prop.type === 'water_prop') { // スクリュー
        propLoadTorque = prop.baseLoadFactor * (propRPS * propRPS * 0.8);
        generatedForce = propRPS * throttle * prop.maxForce * prop.efficiency;
    } else if (prop.type === 'aero_prop') { // 航空プロペラ
        propLoadTorque = prop.baseLoadFactor * (propRPS * propRPS);
        generatedForce = propRPS * throttle * prop.maxForce * prop.efficiency * 0.45; 
    } else if (prop.type === 'aero_rotor') { // ヘリローター
        propLoadTorque = prop.baseLoadFactor * (propRPS * propRPS) * 2.2;
        generatedForce = propRPS * throttle * prop.maxForce * prop.efficiency * 0.8; 
    }

    // 総基数分を掛け算して最終的な負荷と駆動力を出す
    let finalFeedbackLoad = propLoadTorque * gearRatio * propCount;
    let finalGeneratedForce = generatedForce * propCount;

    // 通常型ヘリコプター形式ならテールローターの負荷も自動で足し算
    if (heliLayout === 'conventional' && prop.type === 'aero_rotor') {
        const tailLoad = 0.005 * (propRPS * propRPS) * 2.2 * gearRatio; 
        finalFeedbackLoad += tailLoad;
    }

    // 画面に負荷と駆動力を表示
    document.getElementById('propLoad').innerText = finalFeedbackLoad.toFixed(1) + " Nm";
    document.getElementById('outForce').innerText = finalGeneratedForce.toFixed(0) + " N";

    // --- 5. 【計算】 冷却ラインの流量(L/s)と流量効率の計算 ---
    let calculatedFlow = 0.0;
    let flowEfficiency = 1.0; 
    if (pumpType === 'none') { 
        calculatedFlow = 1.8 + (rps * 0.4); 
        flowEfficiency = spec.isModular ? 0.20 : 0.75; 
    }
    else if (pumpType === 'single') { calculatedFlow = Math.max(0, 28.5 - (radCount * 0.4)); flowEfficiency = 0.85; }
    else if (pumpType === 'dual') { calculatedFlow = Math.max(0, 56.0 - (radCount * 0.2)); flowEfficiency = 1.00; }
    else if (pumpType === 'impeller') { calculatedFlow = rps * 2.1; flowEfficiency = Math.min(1.0, calculatedFlow / 42.0); if (flowEfficiency < 0.1) flowEfficiency = 0.1; }
    else if (pumpType === 'large_single') { calculatedFlow = Math.max(0, 75.0 - (radCount * 0.5)); flowEfficiency = 1.00; }
    else if (pumpType === 'large_dual') { calculatedFlow = Math.max(0, 125.0 - (radCount * 0.3)); flowEfficiency = 1.00; }
    document.getElementById('flowRate').innerText = calculatedFlow.toFixed(1) + " L/s";

   // --- 6. 【計算】 燃料消費量 と 総発熱量の計算 ---
    let fuelConsumptionPerSec = rps * throttle * eCount * spec.fuelFactor * (1.0 + (finalFeedbackLoad * 0.015));
    if (fuelConsumptionPerSec < 0) fuelConsumptionPerSec = 0;
    document.getElementById('fuelCons').innerText = fuelConsumptionPerSec.toFixed(4) + " L/s (" + (fuelConsumptionPerSec * 60).toFixed(1) + " L/min)";

    // エンジンにかかる負荷ストレス(重ければ重いほど発熱が増える補正)
    const loadStressFactor = 1.0 + (finalFeedbackLoad / Math.max(1, enginePower));
    
    // ⚡【修正ポイント①】発熱のバランス定数を「11.5」に調整して、十分な熱を発生させます
    const heatGenerated = rps * throttle * eCount * spec.heatFactor * 11.5 * loadStressFactor;
    document.getElementById('heatGen').innerText = heatGenerated.toFixed(0) + " units";

    // --- 7. 【計算】 推定最高速度(km/h)のシミュレーション ---
    let estSpeedMPS = 0;
    let isStalled = (finalFeedbackLoad > enginePower); // トルク負けのエンスト判定

    let netDrivingForce = finalGeneratedForce - (totalMass * 0.04); // タイヤの転がり抵抗を引いた純駆動力
    if (netDrivingForce <= 0 && finalGeneratedForce > 0) netDrivingForce = finalGeneratedForce * 0.00001; 

    if (!isStalled && netDrivingForce > 0 && rps > 3.5) {
        const totalDragCoefficient = baseDrag * (prop.radius * 2);
        estSpeedMPS = Math.sqrt(netDrivingForce / Math.max(0.001, totalDragCoefficient)) * throttle;
        // 理論上の限界（RPSから割り出した空転なしの最高速度）でストッパーをかける
        const maxTheoreticalMPS = propRPS * (prop.radius * 2) * Math.PI;
        if (estSpeedMPS > maxTheoreticalMPS) estSpeedMPS = maxTheoreticalMPS;
    }

    const speedKMH = estSpeedMPS * 3.6;
    const speedKnot = speedKMH / 1.852;

    // 速度とエンスト状態を画面に反映
    if (isStalled) {
        document.getElementById('speedDisplay').innerText = "STALL";
        document.getElementById('speedDisplay').style.color = "#ff4757";
        document.getElementById('speedUnitKnot').innerText = "(トルク不足でエンスト / Engine Stalled)";
        document.getElementById('speedUnitKnot').style.color = "#ff4757";
    } else {
        document.getElementById('speedDisplay').innerText = speedKMH.toFixed(1) + " km/h";
        document.getElementById('speedDisplay').style.color = "#ffffff";
        document.getElementById('speedUnitKnot').innerText = `(${speedKnot.toFixed(1)} knots / ${estSpeedMPS.toFixed(1)} m/s)`;
        document.getElementById('speedUnitKnot').style.color = "#a4b0be";
    }

   // --- 8. 【計算】 冷却ラインの連続運転・熱飽和限界温度の計算 ---
    const ambientTemp = 25; // 環境ベース温度
    
    // ⚡【修正ポイント②】冷却力の計算式から、邪魔をしていた固定値を取り除き、
    // ラジエーターの枚数と流量(L/s)がストレートに効くように修正（補正係数を 1.0 に調整）
    const totalCoolingPower = (rad.coolingPower * radCount) * flowEfficiency * 1.0; 

    let finalTemp = ambientTemp;
    if (heatGenerated > 0 && totalCoolingPower > 0) {
        // 最終温度 ＝ 環境温度(15℃) ＋ (総発熱量 ÷ 総冷却力)
        finalTemp = ambientTemp + (heatGenerated / totalCoolingPower);
    }
    
    // 120度以上のストワ仕様補正
    if (finalTemp > 120) {
        finalTemp = 120 + (finalTemp - 120) * 0.2; 
    }

    // 温度メーターの数値を更新
    const tempDisplay = document.getElementById('tempDisplay');
    const tempStatus = document.getElementById('tempStatus');
    const tempBox = document.getElementById('tempBox');
    tempDisplay.innerText = finalTemp.toFixed(1) + " ℃";

    // 温度ゾーンによるメーターの色変更処理
    if (finalTemp <= 85) {
        tempBox.style.borderColor = "#1dd1a1"; tempDisplay.style.color = "#1dd1a1";
        tempStatus.innerText = "🟢 安全圏 / SAFE (Continuous operation allowed)"; tempStatus.style.color = "#1dd1a1";
    } else if (finalTemp <= 100) {
        tempBox.style.borderColor = "#ff9f43"; tempDisplay.style.color = "#ff9f43";
        tempStatus.innerText = "⚠️ 高温警告 / WARNING (Near overheating)"; tempStatus.style.color = "#ff9f43";
    } else {
        tempBox.style.borderColor = "#ff4757"; tempDisplay.style.color = "#ff4757";
        tempStatus.innerText = "🚨 爆発危険 / DANGER (Engine will boil and explode!)"; tempStatus.style.color = "#ff4757";
    }

    // --- 9. 【アドバイス生成】 計算結果に基づく冷却アドバイスの自動生成 ---
    const adviceDisplay = document.getElementById('adviceDisplay');
    const adviceBox = document.getElementById('adviceBox');

    if (isStalled) {
        adviceDisplay.innerHTML = "❌ <span style='color:#ff4757; font-weight:bold;'>トルク不足でエンストしています。</span><br>ギヤ比を下げるか、RPSの設定を下げて負荷を減らしてください。";
        adviceBox.style.borderColor = "#ff4757";
    } else {
        if (finalTemp < 80) {
            adviceDisplay.innerHTML = "✅ <span style='color:#1dd1a1; font-weight:bold;'>この冷却設定のままで大丈夫です！</span><br>連続運転してもオーバーヒートの心配はなく、非常に安定しています。";
            adviceBox.style.borderColor = "#1dd1a1";
            adviceBox.style.background = "rgba(29, 209, 161, 0.05)";
        } else if (finalTemp >= 80 && finalTemp < 100) {
            let recommendedRadiators = Math.ceil((heatGenerated * 0.3) / 25);
            adviceDisplay.innerHTML = "🟨 <span style='color:#ffa502; font-weight:bold;'>少し温度が高め（高温警告ゾーン）です。</span><br>安全マージンをとるなら、追加でラジエーターをあと <span style='color:#ffa502; font-weight:bold; font-size:1.1rem;'>" + Math.max(1, recommendedRadiators) + "枚</span> ほど増やしておくと安心です！";
            adviceBox.style.borderColor = "#ffa502";
            adviceBox.style.background = "rgba(255, 165, 2, 0.05)";
        } else {
            let recommendedRadiators = Math.ceil(heatGenerated / 25);
            adviceDisplay.innerHTML = "⚠️ <span style='color:#ff4757; font-weight:bold;'>このままではオーバーヒート（100℃超過）します！</span><br>このRPSで冷し切るには、現状の設定に加えておよそ <span style='color:#ff4757; font-weight:bold; font-size:1.1rem;'>" + Math.max(1, recommendedRadiators) + "枚</span> 以上のラジエーターと電動ポンプの追加をおすすめします。";
            adviceBox.style.borderColor = "#ff4757";
            adviceBox.style.background = "rgba(255, 71, 87, 0.05)";
        }
    }

    // --- 10. 最下部のシステム総合ステータスランプの書き換え ---
    const alertDiv = document.getElementById('statusAlert');
    if (finalFeedbackLoad > enginePower) {
        alertDiv.innerText = "🚨 トルク不足 / STALL: Load too heavy, engine will stall!"; alertDiv.style.color = "#ff6b6b";
    } else if (finalTemp > 100) {
        alertDiv.innerText = "⚠️ 冷却不足 / INSUFFICIENT COOLING: Upgrade radiators or pumps!"; alertDiv.style.color = "#ff9f43";
    } else {
        alertDiv.innerText = "🟢 パワートレイン・推進駆動システム正常 / Operating Safely"; alertDiv.style.color = "#1dd1a1";
    }
}


/* ==========================================================================
   【Eゾーン】 画面が動いた（インプットされた）ら計算を走らせるイベント監視登録
   ========================================================================== 
   裏方の自動実行処理なので、基本的に触る必要はありません。 */
const inputs = ['engineType', 'engineCount', 'gearRatio', 'radType', 'radCount', 'pumpType', 'propCategory', 'propType', 'heliLayout', 'customMass', 'dragType', 'rps', 'throttle'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', updateSimulation);
        el.addEventListener('change', updateSimulation);
    }
});

// パーツが選ばれたら、レイアウトの選択肢（〇WDなど）を再計算してシミュレーションを走らせる登録
document.getElementById('propType').addEventListener('change', () => {
    updateLayoutOptions();
    updateSimulation();
});
document.getElementById('heliLayout').addEventListener('change', updateSimulation);

// 🚀 ページを開いた瞬間に、初期状態（陸上・タイヤ）で1回目の計算を自動で動かす処理
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('propCategory').value = 'ground';
    updatePropPartsOptions();
    updateSimulation();
});