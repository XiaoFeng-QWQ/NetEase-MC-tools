/**
 * nbt-editor.js
 * 核心原理来自：https://github.com/w1zardz/bedrock-nbt-editor
 * 新增功能：根据 localStorage.getItem('lang') === 'zh' 自动翻译标签名为中文
 */

export const TAG = {
    END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6,
    BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12
};

const TAG_NAMES = {
    0: "End", 1: "Byte", 2: "Short", 3: "Int", 4: "Long", 5: "Float", 6: "Double",
    7: "Byte[]", 8: "String", 9: "List", 10: "Compound", 11: "Int[]", 12: "Long[]"
};

// ---------- 中文翻译映射表（基于 Minecraft 基岩版常见 NBT 标签）----------
const ZH_TRANSLATIONS = {
    // 顶层世界设置
    "BiomeOverride": "生物群系覆盖",
    "CenterMapsToOrigin": "地图中心对齐原点",
    "ConfirmedPlatformLockedContent": "平台锁定内容确认",
    "Difficulty": "难度",
    "FlatWorldLayers": "超平坦世界层",
    "ForceGameType": "强制游戏模式",
    "GameType": "游戏模式",
    "Generator": "世界生成器",
    "HasUncompleteWorldFileOnDisk": "磁盘有未完成世界文件",
    "InventoryVersion": "物品栏版本",
    "IsHardcore": "极限模式",
    "LANBroadcast": "局域网广播",
    "LANBroadcastIntent": "局域网广播意图",
    "LastPlayed": "上次游玩时间",
    "LevelName": "世界名称",
    "LimitedWorldOriginX": "有限世界原点X",
    "LimitedWorldOriginY": "有限世界原点Y",
    "LimitedWorldOriginZ": "有限世界原点Z",
    "MinimumCompatibleClientVersion": "最低兼容客户端版本",
    "MultiplayerGame": "多人游戏",
    "MultiplayerGameIntent": "多人游戏意图",
    "NetherScale": "下界缩放比例",
    "NetworkVersion": "网络版本",
    "Platform": "平台",
    "PlatformBroadcastIntent": "平台广播意图",
    "PlayerHasDied": "玩家已死亡",
    "RandomSeed": "随机种子",
    "SpawnV1Villagers": "生成旧版村民",
    "SpawnX": "出生点X",
    "SpawnY": "出生点Y",
    "SpawnZ": "出生点Z",
    "StorageVersion": "存储版本",
    "Time": "世界时间",
    "WorldVersion": "世界版本",
    "XBLBroadcastIntent": "Xbox广播意图",

    // 能力系统 (abilities)
    "abilities": "能力",
    "attackmobs": "攻击生物",
    "attackplayers": "攻击玩家",
    "build": "建造",
    "doorsandswitches": "使用门/开关",
    "flySpeed": "飞行速度",
    "flying": "飞行中",
    "instabuild": "瞬间破坏",
    "invulnerable": "无敌",
    "lightning": "召唤闪电",
    "mayfly": "允许飞行",
    "mine": "挖掘",
    "op": "管理员",
    "opencontainers": "打开容器",
    "teleport": "传送",
    "walkSpeed": "行走速度",

    // 实验性玩法 (experiments)
    "experiments": "实验性玩法",
    "experiments_ever_used": "曾使用实验玩法",
    "saved_with_toggled_experiments": "实验玩法保存",

    // 世界规则与游戏规则
    "bonusChestEnabled": "奖励箱启用",
    "bonusChestSpawned": "奖励箱已生成",
    "cheatsEnabled": "作弊启用",
    "commandblockoutput": "命令方块输出",
    "commandblocksenabled": "命令方块启用",
    "commandsEnabled": "命令启用",
    "contentUUID": "内容UUID",
    "currentTick": "当前刻数",
    "daylightCycle": "昼夜循环",
    "dodaylightcycle": "昼夜循环",
    "doentitydrops": "实体掉落",
    "dofiretick": "火蔓延",
    "doimmediaterespawn": "立即重生",
    "doinsomnia": "生成幻翼",
    "dolimitedcrafting": "限制合成",
    "domobloot": "生物战利品",
    "domobspawning": "生物生成",
    "dotiledrops": "方块掉落",
    "doweathercycle": "天气循环",
    "drowningdamage": "溺水伤害",
    "editorWorldType": "编辑器世界类型",
    "eduOffer": "教育版授权",
    "educationFeaturesEnabled": "教育版特性",
    "falldamage": "摔落伤害",
    "firedamage": "火焰伤害",
    "freezedamage": "冰冻伤害",
    "functioncommandlimit": "函数命令限制",
    "hasBeenLoadedInCreative": "曾在创造模式加载",
    "hasLockedBehaviorPack": "锁定行为包",
    "hasLockedResourcePack": "锁定资源包",
    "immutableWorld": "不可变世界",
    "isCreatedInEditor": "在编辑器中创建",
    "isExportedFromEditor": "从编辑器导出",
    "isFromLockedTemplate": "来自锁定模板",
    "isFromWorldTemplate": "来自世界模板",
    "isRandomSeedAllowed": "允许随机种子",
    "isSingleUseWorld": "一次性世界",
    "isWorldTemplateOptionLocked": "模板选项锁定",
    "keepinventory": "死亡保留物品",
    "lastOpenedWithVersion": "上次打开版本",
    "lightningLevel": "闪电强度",
    "lightningTime": "闪电计时",
    "limitedWorldDepth": "有限世界深度",
    "limitedWorldWidth": "有限世界宽度",
    "maxcommandchainlength": "命令链最大长度",
    "mobgriefing": "生物破坏",
    "naturalregeneration": "自然恢复",
    "neteaseEncryptFlag": "网易加密标志",
    "neteaseStrongholdSelectedChunks": "网易要塞预选区块",
    "permissionsLevel": "权限等级",
    "playerPermissionsLevel": "玩家权限等级",
    "playerssleepingpercentage": "入睡百分比",
    "prid": "个人标识",
    "projectilescanbreakblocks": "弹射物破坏方块",
    "pvp": "玩家对战",
    "rainLevel": "雨强度",
    "rainTime": "雨计时",
    "randomtickspeed": "随机刻速度",
    "recipesunlock": "配方解锁",
    "requiresCopiedPackRemovalCheck": "需复制包移除检查",
    "respawnblocksexplode": "重生锚爆炸破坏",
    "sendcommandfeedback": "命令反馈",
    "serverChunkTickRange": "服务器区块刻范围",
    "showbordereffect": "显示边界效果",
    "showcoordinates": "显示坐标",
    "showdaysplayed": "显示游玩天数",
    "showdeathmessages": "显示死亡消息",
    "showrecipemessages": "显示配方消息",
    "showtags": "显示标签",
    "spawnMobs": "生成生物",
    "spawnradius": "出生点半径",
    "startWithMapEnabled": "开局给予地图",
    "texturePacksRequired": "需要纹理包",
    "tntexplodes": "TNT爆炸",
    "tntexplosiondropdecay": "TNT掉落物衰减",
    "useMsaGamertagsOnly": "仅使用MSA玩家代号",
    "worldStartCount": "世界启动计数",
    "world_policies": "世界策略"
};

/**
 * 根据当前语言获取标签名的显示文本
 * @param {string} name 原始英文标签名
 * @param {string} lang 当前语言代码（如 'zh'）
 * @returns {string} 显示文本
 */
function getDisplayName(name, lang) {
    if (!name) return name;
    if (lang !== 'zh') return name;
    const translation = ZH_TRANSLATIONS[name];
    if (translation) {
        return `${name}(${translation})`;
    }
    return name;
}

/* ===== NBT READER (Little-Endian) ===== */
class NBTReader {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.offset = 0;
        this.buf = new Uint8Array(buffer);
    }
    readByte() { const v = this.view.getInt8(this.offset); this.offset += 1; return v; }
    readUByte() { const v = this.view.getUint8(this.offset); this.offset += 1; return v; }
    readShort() { const v = this.view.getInt16(this.offset, true); this.offset += 2; return v; }
    readUShort() { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
    readInt() { const v = this.view.getInt32(this.offset, true); this.offset += 4; return v; }
    readLong() { const v = this.view.getBigInt64(this.offset, true); this.offset += 8; return v; }
    readFloat() { const v = this.view.getFloat32(this.offset, true); this.offset += 4; return v; }
    readDouble() { const v = this.view.getFloat64(this.offset, true); this.offset += 8; return v; }
    readString() {
        const len = this.readUShort();
        const bytes = this.buf.slice(this.offset, this.offset + len);
        this.offset += len;
        return new TextDecoder().decode(bytes);
    }
    readTag(tagType) {
        switch (tagType) {
            case TAG.BYTE: return { type: TAG.BYTE, value: this.readByte() };
            case TAG.SHORT: return { type: TAG.SHORT, value: this.readShort() };
            case TAG.INT: return { type: TAG.INT, value: this.readInt() };
            case TAG.LONG: return { type: TAG.LONG, value: this.readLong() };
            case TAG.FLOAT: return { type: TAG.FLOAT, value: this.readFloat() };
            case TAG.DOUBLE: return { type: TAG.DOUBLE, value: this.readDouble() };
            case TAG.BYTE_ARRAY: {
                const len = this.readInt();
                const arr = [];
                for (let i = 0; i < len; i++) arr.push(this.readByte());
                return { type: TAG.BYTE_ARRAY, value: arr };
            }
            case TAG.STRING: return { type: TAG.STRING, value: this.readString() };
            case TAG.LIST: {
                const listType = this.readUByte();
                const len = this.readInt();
                const items = [];
                for (let i = 0; i < len; i++) items.push(this.readTag(listType));
                return { type: TAG.LIST, listType, value: items };
            }
            case TAG.COMPOUND: {
                const entries = [];
                while (true) {
                    const t = this.readUByte();
                    if (t === TAG.END) break;
                    const name = this.readString();
                    const tag = this.readTag(t);
                    tag.name = name;
                    entries.push(tag);
                }
                return { type: TAG.COMPOUND, value: entries };
            }
            case TAG.INT_ARRAY: {
                const len = this.readInt();
                const arr = [];
                for (let i = 0; i < len; i++) arr.push(this.readInt());
                return { type: TAG.INT_ARRAY, value: arr };
            }
            case TAG.LONG_ARRAY: {
                const len = this.readInt();
                const arr = [];
                for (let i = 0; i < len; i++) arr.push(this.readLong());
                return { type: TAG.LONG_ARRAY, value: arr };
            }
            default: throw new Error("Unknown tag type: " + tagType);
        }
    }
    parse() {
        const rootType = this.readUByte();
        if (rootType !== TAG.COMPOUND) throw new Error("Root tag must be TAG_Compound");
        const rootName = this.readString();
        const root = this.readTag(TAG.COMPOUND);
        root.name = rootName;
        return root;
    }
}

/* ===== NBT WRITER (Little-Endian) ===== */
class NBTWriter {
    constructor() { this.parts = []; this.size = 0; }
    writeByte(v) { const b = new Uint8Array(1); new DataView(b.buffer).setInt8(0, v); this.parts.push(b); this.size += 1; }
    writeUByte(v) { const b = new Uint8Array(1); b[0] = v & 0xff; this.parts.push(b); this.size += 1; }
    writeShort(v) { const b = new Uint8Array(2); new DataView(b.buffer).setInt16(0, v, true); this.parts.push(b); this.size += 2; }
    writeUShort(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); this.parts.push(b); this.size += 2; }
    writeInt(v) { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, v, true); this.parts.push(b); this.size += 4; }
    writeLong(v) { const b = new Uint8Array(8); new DataView(b.buffer).setBigInt64(0, BigInt(v), true); this.parts.push(b); this.size += 8; }
    writeFloat(v) { const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, v, true); this.parts.push(b); this.size += 4; }
    writeDouble(v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v, true); this.parts.push(b); this.size += 8; }
    writeString(s) {
        const encoded = new TextEncoder().encode(s);
        this.writeUShort(encoded.length);
        this.parts.push(encoded);
        this.size += encoded.length;
    }
    writeTag(tag) {
        switch (tag.type) {
            case TAG.BYTE: this.writeByte(tag.value); break;
            case TAG.SHORT: this.writeShort(tag.value); break;
            case TAG.INT: this.writeInt(tag.value); break;
            case TAG.LONG: this.writeLong(tag.value); break;
            case TAG.FLOAT: this.writeFloat(tag.value); break;
            case TAG.DOUBLE: this.writeDouble(tag.value); break;
            case TAG.BYTE_ARRAY:
                this.writeInt(tag.value.length);
                for (const v of tag.value) this.writeByte(v);
                break;
            case TAG.STRING: this.writeString(tag.value); break;
            case TAG.LIST: {
                const lt = tag.listType || (tag.value.length ? tag.value[0].type : TAG.END);
                this.writeUByte(lt);
                this.writeInt(tag.value.length);
                for (const item of tag.value) this.writeTag(item);
                break;
            }
            case TAG.COMPOUND:
                for (const entry of tag.value) {
                    this.writeUByte(entry.type);
                    this.writeString(entry.name);
                    this.writeTag(entry);
                }
                this.writeUByte(TAG.END);
                break;
            case TAG.INT_ARRAY:
                this.writeInt(tag.value.length);
                for (const v of tag.value) this.writeInt(v);
                break;
            case TAG.LONG_ARRAY:
                this.writeInt(tag.value.length);
                for (const v of tag.value) this.writeLong(v);
                break;
        }
    }
    writeRoot(root) {
        this.writeUByte(TAG.COMPOUND);
        this.writeString(root.name || "");
        this.writeTag(root);
    }
    toArrayBuffer() {
        const result = new Uint8Array(this.size);
        let offset = 0;
        for (const p of this.parts) {
            result.set(p, offset);
            offset += p.length;
        }
        return result.buffer;
    }
}

/* ===== 编辑器核心 ===== */
export function initNbtEditor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);

    let currentRoot = null;
    let headerVersion = 0;

    // ---------- 辅助函数 ----------
    function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

    function formatValue(tag) {
        switch (tag.type) {
            case TAG.BYTE: return String(tag.value);
            case TAG.SHORT: return String(tag.value);
            case TAG.INT: return String(tag.value);
            case TAG.LONG: return String(tag.value);
            case TAG.FLOAT: return String(tag.value);
            case TAG.DOUBLE: return String(tag.value);
            case TAG.STRING: return '"' + tag.value + '"';
            case TAG.BYTE_ARRAY: return "[" + tag.value.length + " bytes]";
            case TAG.INT_ARRAY: return "[" + tag.value.length + " ints]";
            case TAG.LONG_ARRAY: return "[" + tag.value.length + " longs]";
            case TAG.LIST: return tag.value.length + " entries";
            case TAG.COMPOUND: return tag.value.length + " entries";
            default: return "";
        }
    }

    function isContainer(tag) { return tag.type === TAG.COMPOUND || tag.type === TAG.LIST; }
    function isArrayTag(tag) { return tag.type === TAG.BYTE_ARRAY || tag.type === TAG.INT_ARRAY || tag.type === TAG.LONG_ARRAY; }
    function isEditable(tag) { return !isContainer(tag) && !isArrayTag(tag); }

    // ---------- 内联编辑 ----------
    function startEditing(tag, el) {
        if (el.classList.contains("editing")) return;
        el.classList.add("editing");
        const input = document.createElement("input");
        input.type = "text";
        const initialValue = tag.type === TAG.STRING ? tag.value : String(tag.value);
        input.value = initialValue;
        const len = initialValue.length;
        input.size = Math.max(len + 2, 30);
        el.textContent = "";
        el.appendChild(input);
        input.focus();
        input.select();

        function finish() {
            el.classList.remove("editing");
            try {
                applyValue(tag, input.value);
            } catch (err) {
                toast("Invalid value: " + err.message, "error");
            }
            el.textContent = formatValue(tag);
        }
        input.addEventListener("blur", finish);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); input.blur(); }
            if (e.key === "Escape") { input.value = initialValue; input.blur(); }
        });
        input.addEventListener("input", () => {
            const newLen = input.value.length;
            input.size = Math.max(newLen + 2, 30);
        });
    }

    function startArrayEditing(tag, el) {
        if (el.classList.contains("editing")) return;
        el.classList.add("editing");
        const input = document.createElement("input");
        input.type = "text";
        const initialValue = tag.value.map(String).join(", ");
        input.value = initialValue;
        const len = initialValue.length;
        input.size = Math.max(len + 2, 40);
        el.textContent = "";
        el.appendChild(input);
        input.focus();

        function finish() {
            el.classList.remove("editing");
            try {
                const parts = input.value.split(",").map(s => s.trim()).filter(s => s !== "");
                if (tag.type === TAG.BYTE_ARRAY) tag.value = parts.map(s => { const n = parseInt(s); if (isNaN(n) || n < -128 || n > 127) throw new Error("Invalid byte: " + s); return n; });
                else if (tag.type === TAG.INT_ARRAY) tag.value = parts.map(s => { const n = parseInt(s); if (isNaN(n)) throw new Error("Invalid int: " + s); return n; });
                else if (tag.type === TAG.LONG_ARRAY) tag.value = parts.map(s => BigInt(s));
            } catch (err) {
                toast("Invalid value: " + err.message, "error");
            }
            el.textContent = formatValue(tag);
        }
        input.addEventListener("blur", finish);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); input.blur(); }
            if (e.key === "Escape") { input.value = initialValue; input.blur(); }
        });
        input.addEventListener("input", () => {
            const newLen = input.value.length;
            input.size = Math.max(newLen + 2, 40);
        });
    }

    function applyValue(tag, str) {
        switch (tag.type) {
            case TAG.BYTE: { const n = parseInt(str); if (isNaN(n) || n < -128 || n > 127) throw new Error("Byte must be -128..127"); tag.value = n; break; }
            case TAG.SHORT: { const n = parseInt(str); if (isNaN(n) || n < -32768 || n > 32767) throw new Error("Short must be -32768..32767"); tag.value = n; break; }
            case TAG.INT: { const n = parseInt(str); if (isNaN(n)) throw new Error("Invalid integer"); tag.value = n; break; }
            case TAG.LONG: tag.value = BigInt(str); break;
            case TAG.FLOAT: { const n = parseFloat(str); if (isNaN(n)) throw new Error("Invalid float"); tag.value = n; break; }
            case TAG.DOUBLE: { const n = parseFloat(str); if (isNaN(n)) throw new Error("Invalid double"); tag.value = n; break; }
            case TAG.STRING: tag.value = str; break;
            default: throw new Error("Cannot edit this tag type inline");
        }
    }

    // ---------- 树渲染（含翻译） ----------
    function createTreeNode(tag, parentTag, indexInParent) {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";

        const row = document.createElement("div");
        row.className = "node-row";

        const toggle = document.createElement("button");
        toggle.className = "win-btn-sm node-toggle" + (isContainer(tag) || isArrayTag(tag) ? "" : " leaf");
        toggle.innerHTML = "<img src='./res/icons/directory_closed-1.png' alt='Toggle'>";
        row.appendChild(toggle);

        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = TAG_NAMES[tag.type] || "?";
        row.appendChild(badge);

        // 处理标签名称（支持中文翻译）
        const lang = localStorage.getItem('lang');
        if (tag.name !== undefined && tag.name !== null) {
            const nameEl = document.createElement("span");
            nameEl.className = "node-name";
            const displayName = getDisplayName(tag.name, lang);
            nameEl.textContent = displayName;
            row.appendChild(nameEl);
        } else if (indexInParent !== null) {
            const nameEl = document.createElement("span");
            nameEl.className = "node-name";
            nameEl.textContent = "[" + indexInParent + "]";
            nameEl.style.color = "var(--text2, #888)";
            row.appendChild(nameEl);
        }

        const valEl = document.createElement("span");
        valEl.className = "node-value";
        valEl.textContent = formatValue(tag);
        row.appendChild(valEl);

        if (isEditable(tag)) {
            valEl.addEventListener("click", (e) => { e.stopPropagation(); startEditing(tag, valEl); });
        } else if (isArrayTag(tag)) {
            valEl.addEventListener("click", (e) => { e.stopPropagation(); startArrayEditing(tag, valEl); });
        }

        wrapper.appendChild(row);

        if (isContainer(tag) || isArrayTag(tag)) {
            const childrenDiv = document.createElement("div");
            childrenDiv.className = "node-children";
            if (isArrayTag(tag)) {
                tag.value.forEach((val, i) => {
                    let childType = TAG.BYTE;
                    if (tag.type === TAG.INT_ARRAY) childType = TAG.INT;
                    if (tag.type === TAG.LONG_ARRAY) childType = TAG.LONG;
                    const pseudo = { type: childType, value: val, name: null };
                    const childNode = createTreeNode(pseudo, tag, i);
                    childrenDiv.appendChild(childNode);
                });
            } else if (tag.type === TAG.COMPOUND) {
                tag.value.forEach((child, i) => childrenDiv.appendChild(createTreeNode(child, tag, i)));
            } else if (tag.type === TAG.LIST) {
                tag.value.forEach((child, i) => childrenDiv.appendChild(createTreeNode(child, tag, i)));
            }
            wrapper.appendChild(childrenDiv);

            let open = !parentTag; // 根节点默认展开
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                open = !open;
                toggle.innerHTML = open ? "<img src='./res/icons/directory_open_cool-1.png' alt='Toggle'>" : "<img src='./res/icons/directory_closed-1.png' alt='Toggle'>";
                childrenDiv.classList.toggle("open", open);
            });
            if (open) {
                toggle.innerHTML = "<img src='./res/icons/directory_open_cool-1.png' alt='Toggle'>";
                childrenDiv.classList.add("open");
            }
        }
        return wrapper;
    }

    function renderTree() {
        container.innerHTML = "";
        if (!currentRoot) return;
        const node = createTreeNode(currentRoot, null, null);
        container.appendChild(node);
    }

    // ---------- 简单提示 ----------
    function toast(msg, type = "info") {
        const toastDiv = document.createElement("div");
        toastDiv.className = `nbt-toast ${type}`;
        toastDiv.textContent = msg;
        document.body.appendChild(toastDiv);
        setTimeout(() => { toastDiv.style.opacity = "0"; setTimeout(() => toastDiv.remove(), 300); }, 3000);
    }

    // ---------- 公共 API ----------
    function load(buffer) {
        if (buffer.byteLength < 8) throw new Error("File too small");
        const headerView = new DataView(buffer, 0, 8);
        headerVersion = headerView.getInt32(0, true);
        const payloadLen = headerView.getUint32(4, true);
        const payloadBuf = buffer.slice(8);
        const reader = new NBTReader(payloadBuf);
        currentRoot = reader.parse();
        renderTree();
    }

    function save() {
        if (!currentRoot) throw new Error("No NBT root to save");
        const writer = new NBTWriter();
        writer.writeRoot(currentRoot);
        const nbtBuf = writer.toArrayBuffer();
        const nbtBytes = new Uint8Array(nbtBuf);
        const full = new Uint8Array(8 + nbtBytes.length);
        const dv = new DataView(full.buffer);
        dv.setInt32(0, headerVersion, true);
        dv.setUint32(4, nbtBytes.length, true);
        full.set(nbtBytes, 8);
        return full.buffer;
    }

    return { load, save };
}