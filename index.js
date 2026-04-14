// XToys Integration for SillyTavern
// 通过XToys Webhook联动玩具振动强度

import { eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'XToys Integration';
const SETTINGS_KEY = 'xtoys_integration';

// 默认设置
const defaultSettings = {
    enabled: false,
    webhookId: '',
    intensity_mode: 'sentiment', // sentiment | keyword | fixed
    base_intensity: 50,
    keyword_rules: [],
};

let settings = {};

// 加载设置
function loadSettings() {
    const ctx = getContext();
    settings = Object.assign({}, defaultSettings, ctx.extensionSettings[SETTINGS_KEY] || {});
    ctx.extensionSettings[SETTINGS_KEY] = settings;
}

// 保存设置
function saveSettings() {
    saveSettingsDebounced();
}

// 发送振动指令到XToys
async function sendToXToys(intensity) {
    if (!settings.enabled || !settings.webhookId) return;

    // intensity: 0~100
    const clampedIntensity = Math.max(0, Math.min(100, Math.round(intensity)));

    try {
        const url = `https://webhook.xtoys.app/${settings.webhookId}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'vibrate', intensity: clampedIntensity }),
        });
        console.log(`[XToys] 发送强度: ${clampedIntensity}`);
    } catch (e) {
        console.warn('[XToys] 发送失败:', e);
    }
}

// 情感分析：根据文本内容估算强度
function analyzeText(text) {
    const lower = text.toLowerCase();

    // 关键词权重表
    const highKeywords = ['喘', '颤抖', '高潮', '求你', '不行了', '啊啊', '太强', 'please', 'more', 'harder', 'yes', 'moan', 'shiver', 'climax'];
    const midKeywords = ['喜欢', '舒服', '心跳', '脸红', '紧张', '期待', 'like', 'feel', 'warm', 'close', 'blush', 'nervous'];
    const lowKeywords = ['平静', '等待', '思念', 'calm', 'wait', 'miss', 'hello', 'hi'];

    let score = 30; // 基础分

    for (const kw of highKeywords) {
        if (lower.includes(kw)) score += 20;
    }
    for (const kw of midKeywords) {
        if (lower.includes(kw)) score += 10;
    }
    for (const kw of lowKeywords) {
        if (lower.includes(kw)) score -= 10;
    }

    // 感叹号和省略号加分
    const exclamations = (text.match(/[！!]/g) || []).length;
    const ellipsis = (text.match(/[…。\.]{2,}/g) || []).length;
    score += exclamations * 5;
    score += ellipsis * 3;

    return Math.max(0, Math.min(100, score));
}

// 处理AI回复
async function onMessageReceived(messageId) {
    if (!settings.enabled || !settings.webhookId) return;

    const ctx = getContext();
    const message = ctx.chat[messageId];
    if (!message || message.is_user) return;

    const text = message.mes || '';
    let intensity = settings.base_intensity;

    if (settings.intensity_mode === 'sentiment') {
        intensity = analyzeText(text);
    } else if (settings.intensity_mode === 'fixed') {
        intensity = settings.base_intensity;
    }

    await sendToXToys(intensity);

    // 5秒后自动停止
    setTimeout(() => sendToXToys(0), 5000);
}

// 渲染设置面板 HTML
function renderSettingsHTML() {
    return `
<div id="xtoys_settings" class="extension-settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>🎮 XToys 联动设置</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <div class="flex-container alignitemscenter">
                <label class="checkbox_label" for="xtoys_enabled">
                    <input type="checkbox" id="xtoys_enabled" />
                    <span>启用XToys联动</span>
                </label>
            </div>

            <div class="flex-container flexFlowColumn" style="margin-top:8px;">
                <label for="xtoys_webhook_id"><b>Webhook ID</b></label>
                <input 
                    type="text" 
                    id="xtoys_webhook_id" 
                    class="text_pole" 
                    placeholder="粘贴你的XToys Webhook ID"
                    style="margin-top:4px;"
                />
                <small style="color:#aaa;margin-top:2px;">在 xtoys.app 加载脚本后可获得 Webhook ID</small>
            </div>

            <div class="flex-container flexFlowColumn" style="margin-top:8px;">
                <label for="xtoys_mode"><b>强度模式</b></label>
                <select id="xtoys_mode" class="text_pole" style="margin-top:4px;">
                    <option value="sentiment">自动分析（根据AI回复内容）</option>
                    <option value="fixed">固定强度</option>
                </select>
            </div>

            <div class="flex-container flexFlowColumn" style="margin-top:8px;" id="xtoys_base_intensity_row">
                <label for="xtoys_base_intensity"><b>固定强度: <span id="xtoys_intensity_value">50</span>%</b></label>
                <input 
                    type="range" 
                    id="xtoys_base_intensity" 
                    min="0" max="100" step="5"
                    style="margin-top:4px;"
                />
            </div>

            <div style="margin-top:10px;display:flex;gap:8px;">
                <button id="xtoys_test_btn" class="menu_button">🔊 测试振动</button>
                <button id="xtoys_stop_btn" class="menu_button">⏹ 停止</button>
            </div>

            <div id="xtoys_status" style="margin-top:6px;font-size:0.85em;color:#aaa;"></div>
        </div>
    </div>
</div>`;
}

// 绑定面板事件
function bindSettingsEvents() {
    const enabledEl = document.getElementById('xtoys_enabled');
    const webhookEl = document.getElementById('xtoys_webhook_id');
    const modeEl = document.getElementById('xtoys_mode');
    const intensityEl = document.getElementById('xtoys_base_intensity');
    const intensityValueEl = document.getElementById('xtoys_intensity_value');
    const testBtn = document.getElementById('xtoys_test_btn');
    const stopBtn = document.getElementById('xtoys_stop_btn');
    const statusEl = document.getElementById('xtoys_status');
    const intensityRow = document.getElementById('xtoys_base_intensity_row');

    // 初始化值
    enabledEl.checked = settings.enabled;
    webhookEl.value = settings.webhookId || '';
    modeEl.value = settings.intensity_mode || 'sentiment';
    intensityEl.value = settings.base_intensity || 50;
    intensityValueEl.textContent = settings.base_intensity || 50;
    intensityRow.style.display = settings.intensity_mode === 'fixed' ? 'flex' : 'none';

    enabledEl.addEventListener('change', () => {
        settings.enabled = enabledEl.checked;
        saveSettings();
    });

    webhookEl.addEventListener('input', () => {
        settings.webhookId = webhookEl.value.trim();
        saveSettings();
    });

    modeEl.addEventListener('change', () => {
        settings.intensity_mode = modeEl.value;
        intensityRow.style.display = modeEl.value === 'fixed' ? 'flex' : 'none';
        saveSettings();
    });

    intensityEl.addEventListener('input', () => {
        settings.base_intensity = parseInt(intensityEl.value);
        intensityValueEl.textContent = intensityEl.value;
        saveSettings();
    });

    testBtn.addEventListener('click', async () => {
        if (!settings.webhookId) {
            statusEl.textContent = '❌ 请先填写 Webhook ID';
            return;
        }
        statusEl.textContent = '📡 发送测试振动...';
        await sendToXToys(70);
        setTimeout(() => sendToXToys(0), 3000);
        statusEl.textContent = '✅ 已发送！振动3秒后停止';
    });

    stopBtn.addEventListener('click', async () => {
        await sendToXToys(0);
        statusEl.textContent = '⏹ 已停止';
    });
}

// 初始化扩展
jQuery(async () => {
    loadSettings();

    // 注入设置面板
    $('#extensions_settings').append(renderSettingsHTML());
    bindSettingsEvents();

    // 监听AI回复事件
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);

    console.log(`[${EXT_NAME}] 已加载`);
});
