'use strict';

import $ from './jquery-4.0.0.esm.min.js';
import { i18n, switchLanguage, t } from './i18n.js';
import { initNbtEditor } from './nbt-editor.js';

const elements = {
    fileInput: $('#fileInput'),
    nbtFileInput: $('#nbtFileInput'),
    browseBtn: $('#browseBtn'),
    browseNbtBtn: $('#browseNbtBtn'),
    fsApiBtn: $('#fsApiBtn'),
    apiNoteContainer: $('#apiNoteContainer'),
    fileInfo: $('#fileInfo'),
    nbtFileInfo: $('#nbtFileInfo'),
    processBtn: $('#processBtn'),
    openNbtBtn: $('#openNbtBtn'),
    launchNbtEditorBtn: $('#launchNbtEditorBtn'),
    status: $('#status'),
    nbtStatus: $('#nbtStatus'),
    progressBar: $('#progressBar'),
    progressText: $('#progressText'),
    downloadBtn: $('#downloadBtn'),
    nbtDownloadBtn: $('#nbtDownloadBtn'),
    aboutBtn: $('#aboutBtn'),
    trayAboutBtn: $('#trayAboutBtn'),
    aboutDialog: $('#aboutDialog'),
    nbtDialog: $('#nbtDialog'),
    nbtSaveApply: $('#nbtSaveApply'),
    langMenu: $('#langMenu'),
    languageItems: $('.language-item'),
    uploadArea: $('#uploadArea'),
    nbtUploadArea: $('#nbtUploadArea'),
    decryptorShortcut: $('#decryptorShortcut'),
    nbtShortcut: $('#nbtShortcut'),
    decryptorTaskBtn: $('#decryptorTaskBtn'),
    nbtTaskBtn: $('#nbtTaskBtn'),
    decryptorWindow: $('#decryptorWindow'),
    nbtAppWindow: $('#nbtAppWindow'),
    windowLaunchers: $('[data-open-window]'),
    windowCloseButtons: $('.window-close'),
    windowMinimizeButtons: $('.window-minimize'),
    windowToggleButtons: $('.window-toggle')
};

const ENCRYPTION_HEADER = new Uint8Array([0x80, 0x1D, 0x30, 0x01]);
const TEXT_ENCODER = new TextEncoder();
const IS_FS_API_SUPPORTED = 'showDirectoryPicker' in window;

const state = {
    currentFile: null,
    directoryHandle: null,
    dbDirectoryHandle: null,
    useFileSystemAPI: false,
    isProcessing: false,
    decryptDownloadUrl: null,
    nbtDownloadUrl: null,
    levelDatData: null,
    levelDatHandle: null,
    standaloneNbtFile: null,
    zipObject: null,
    currentArchiveName: null,
    nbtSource: null,
    nbtEditor: null,
    activeWindow: 'decryptorWindow'
};

const setStatusHtml = (html) => elements.status.html(html);
const setStatusText = (text) => elements.status.text(text);
const setNbtStatusHtml = (html) => elements.nbtStatus.html(html);
const setNbtStatusText = (text) => elements.nbtStatus.text(text);

const showToast = (options) => {
    const icons = {
        error: '<img src="./res/icons/msg_error-0.png" alt="Error">',
        info: '<img src="./res/icons/msg_information-0.png" alt="Information">',
        warning: '<img src="./res/icons/msg_warning-0.png" alt="Warning">'
    };
    const iconStr = icons[options.type] || icons.info;
    const toast = document.createElement('div');
    toast.className = 'win-dialog';
    toast.innerHTML = `
        <div class="win-title-bar">
            <span class="win-title-text">${options.title || 'System Message'}</span>
            <div class="win-title-controls">
                <button class="win-btn win-btn-close" type="button" onclick="this.closest('.win-dialog').remove()">X</button>
            </div>
        </div>
        <div class="win-dialog-body" style="display:flex;align-items:flex-start;gap:15px;padding:15px 20px;">
            <div class="win-dialog-icon" style="font-size:24px;line-height:1;">${iconStr}</div>
            <div class="win-msg" style="margin-top:4px;">${options.message}</div>
        </div>
        <div class="win-dialog-footer" style="padding:10px;border-top:none;box-shadow:none;">
            <button class="win-btn" style="width:75px;height:23px;" type="button" onclick="this.closest('.win-dialog').remove()">OK</button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        const okBtn = toast.querySelector('.win-dialog-footer .win-btn');
        if (okBtn) okBtn.focus();
    }, 10);
    if (options.duration !== 0) {
        setTimeout(() => toast.remove(), options.duration || 4000);
    }
};

const showError = (htmlMsg, snackbarMsg) => {
    const plainText = snackbarMsg || htmlMsg.replace(/<[^>]*>?/gm, '');
    setStatusHtml(`<span class="text-error">${htmlMsg}</span>`);
    showToast({ message: plainText, duration: 5000, type: 'error' });
};

const showSuccess = (htmlMsg, snackbarMsg) => {
    const plainText = snackbarMsg || htmlMsg.replace(/<[^>]*>?/gm, '');
    setStatusHtml(`<span class="text-success">${htmlMsg}</span>`);
    showToast({ message: plainText, duration: 3000 });
};

const updateProgress = (percent, message) => {
    const percentValue = Math.min(100, Math.max(0, percent));
    elements.progressBar.prop('value', percentValue);
    elements.progressText.text(`${Math.round(percentValue)}%`);
    if (message) setStatusHtml(`${message}<br><br>${t('progress_title')}: ${Math.round(percentValue)}%`);
};

const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
};

const checkHeader = (fileData, header) => {
    if (fileData.length < header.length) return false;
    for (let i = 0; i < header.length; i++) {
        if (fileData[i] !== header[i]) return false;
    }
    return true;
};

const xor = (data, key) => {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ key[i % key.length];
    }
    return result;
};

const optimizeKey = (key) => {
    if (key.length === 16) {
        let isSame = true;
        for (let i = 0; i < 8; i++) {
            if (key[i] !== key[i + 8]) {
                isSame = false;
                break;
            }
        }
        if (isSame) return key.slice(0, 8);
    }
    return key;
};

const getKey = async (currentFileData, manifestName) => {
    const encryptedData = currentFileData.slice(4);
    const manifestBytes = TEXT_ENCODER.encode(manifestName);
    const source = new Uint8Array(manifestBytes.length + 1);
    source.set(manifestBytes);
    source[manifestBytes.length] = 0x0A;
    const key = xor(encryptedData, source);
    return optimizeKey(key);
};

const decryptFile = (fileData, key) => xor(fileData.slice(4), key);

const isFileInDbFolder = (path) => /(^|\/)db\/[^\/]+$/i.test(path);

const isSupportedArchiveFile = (file) => {
    const fileName = file.name.toLowerCase();
    return file.type === 'application/zip'
        || fileName.endsWith('.zip')
        || fileName.endsWith('.mcworld');
};

const isStandaloneNbtFile = (file) => {
    const fileName = file.name.toLowerCase();
    return fileName === 'level.dat'
        || fileName.endsWith('.dat')
        || fileName.endsWith('.nbt');
};

const resetDecryptDownload = () => {
    if (state.decryptDownloadUrl) {
        URL.revokeObjectURL(state.decryptDownloadUrl);
        state.decryptDownloadUrl = null;
    }
    elements.downloadBtn.addClass('hidden-btn').removeAttr('href download');
};

const resetNbtDownload = () => {
    if (state.nbtDownloadUrl) {
        URL.revokeObjectURL(state.nbtDownloadUrl);
        state.nbtDownloadUrl = null;
    }
    elements.nbtDownloadBtn.addClass('hidden-btn').removeAttr('href download');
};

const resetNbtState = () => {
    state.levelDatData = null;
    state.levelDatHandle = null;
    state.standaloneNbtFile = null;
    state.zipObject = null;
    state.currentArchiveName = null;
    state.nbtSource = null;
    state.nbtEditor = null;
    elements.openNbtBtn.prop('disabled', true);
    elements.launchNbtEditorBtn.prop('disabled', true);
    resetNbtDownload();
};

const setLoadedLevelDat = ({ data, source, fileHandle = null, file = null, archiveName = null }) => {
    state.levelDatData = data;
    state.levelDatHandle = fileHandle;
    state.standaloneNbtFile = file;
    state.nbtSource = source;
    state.currentArchiveName = archiveName;
    elements.openNbtBtn.prop('disabled', false);
    elements.launchNbtEditorBtn.prop('disabled', false);
};

const setProcessing = (isProcessing) => {
    state.isProcessing = isProcessing;
    elements.processBtn
        .prop('disabled', isProcessing)
        .html(isProcessing ? t('js_btn_processing') : t('btn_start_decrypt'));
};

const setActiveWindow = (windowId) => {
    state.activeWindow = windowId;
    const windows = [
        { id: 'decryptorWindow', $window: elements.decryptorWindow, $task: elements.decryptorTaskBtn, $shortcut: elements.decryptorShortcut },
        { id: 'nbtAppWindow', $window: elements.nbtAppWindow, $task: elements.nbtTaskBtn, $shortcut: elements.nbtShortcut }
    ];

    windows.forEach(({ id, $window, $task, $shortcut }) => {
        const isActive = id === windowId;
        $window.toggleClass('active-window', isActive);
        $task.toggleClass('active-task', isActive && !$window.hasClass('window-hidden'));
        $shortcut.toggleClass('active-shortcut', isActive);
    });
};

const openWindow = (windowId) => {
    const $window = $(`#${windowId}`);
    $window.removeClass('window-hidden');
    setActiveWindow(windowId);
};

const hideWindow = (windowId) => {
    const $window = $(`#${windowId}`);
    $window.addClass('window-hidden');
    if (state.activeWindow === windowId) {
        const fallback = windowId === 'decryptorWindow' ? 'nbtAppWindow' : 'decryptorWindow';
        if (!$(`#${fallback}`).hasClass('window-hidden')) {
            setActiveWindow(fallback);
        }
    }
    if (windowId === 'decryptorWindow') {
        elements.decryptorTaskBtn.removeClass('active-task');
    } else {
        elements.nbtTaskBtn.removeClass('active-task');
    }
};

const deriveDecryptedArchiveName = (originalName) => {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.zip')) {
        return originalName.replace(/\.zip$/i, '_decrypted.mcworld');
    }
    if (lower.endsWith('.mcworld')) {
        return originalName.replace(/\.mcworld$/i, '_decrypted.mcworld');
    }
    return 'mc_world_decrypted.mcworld';
};

const deriveEditedNbtDownloadName = () => {
    if (state.nbtSource === 'standalone') {
        return state.standaloneNbtFile?.name || 'level.dat';
    }
    if (state.nbtSource === 'zip') {
        return deriveDecryptedArchiveName(state.currentArchiveName || 'world.mcworld');
    }
    return 'level.dat';
};

const extractLevelDatFromZipObject = async (zipObject, archiveName, updateUi) => {
    const levelDatEntry = zipObject.file('level.dat');
    if (!levelDatEntry) {
        throw new Error(t('err_no_leveldat'));
    }
    const buffer = await levelDatEntry.async('arraybuffer');
    setLoadedLevelDat({
        data: new Uint8Array(buffer),
        source: 'zip',
        archiveName
    });
    if (updateUi) {
        elements.nbtFileInfo.text(`${t('word_selected')}: ${archiveName} (level.dat)`);
        setNbtStatusText(t('js_nbt_archive_ready'));
    }
};

const extractAndParseLevelDat = async () => {
    if (state.useFileSystemAPI && state.directoryHandle) {
        const levelDatHandle = await state.directoryHandle.getFileHandle('level.dat');
        const file = await levelDatHandle.getFile();
        const buffer = await file.arrayBuffer();
        setLoadedLevelDat({
            data: new Uint8Array(buffer),
            source: 'directory',
            fileHandle: levelDatHandle
        });
    } else if (state.zipObject) {
        await extractLevelDatFromZipObject(state.zipObject, state.currentFile?.name || 'world.mcworld', false);
    }
};

const handleStandaloneNbtFileSelect = async (file) => {
    const buffer = await file.arrayBuffer();
    setLoadedLevelDat({
        data: new Uint8Array(buffer),
        source: 'standalone',
        file
    });
    elements.nbtFileInfo.text(`${t('word_selected_nbt')}: ${file.name} (${formatFileSize(file.size)})`);
    setNbtStatusText(t('js_nbt_ready'));
};

const handleNbtImport = async (file) => {
    resetNbtDownload();
    elements.nbtUploadArea.removeClass('error-border');
    try {
        if (isStandaloneNbtFile(file)) {
            await handleStandaloneNbtFileSelect(file);
        } else if (isSupportedArchiveFile(file)) {
            const zipObject = await window.JSZip.loadAsync(file);
            await extractLevelDatFromZipObject(zipObject, file.name, true);
            state.zipObject = zipObject;
        } else {
            throw new Error(t('err_upload_nbt_only'));
        }
        openWindow('nbtAppWindow');
    } catch (error) {
        console.error('NBT import error:', error);
        resetNbtState();
        elements.nbtFileInfo.text(t('err_select_fail'));
        elements.nbtUploadArea.addClass('error-border');
        setNbtStatusText(t('nbt_status_waiting'));
        showToast({ message: error.message, duration: 5000, type: 'error' });
    }
};

const handleDecryptArchiveSelect = (file) => {
    try {
        if (!isSupportedArchiveFile(file)) {
            showError(t('err_upload_zip_only'), t('err_upload_zip_plain'));
            elements.fileInfo.text(`${t('err_file_type')}: ${file.name}`);
            elements.uploadArea.addClass('error-border');
            setTimeout(() => elements.uploadArea.removeClass('error-border'), 3000);
            elements.processBtn.prop('disabled', true);
            return;
        }
        elements.uploadArea.removeClass('error-border');
        state.currentFile = file;
        state.directoryHandle = null;
        state.dbDirectoryHandle = null;
        state.useFileSystemAPI = false;
        elements.fileInfo.text(`${t('word_selected')}: ${file.name} (${formatFileSize(file.size)})`);
        elements.processBtn.prop('disabled', false);
        setStatusText(t('js_ready'));
        resetDecryptDownload();
        resetNbtState();
        openWindow('decryptorWindow');
    } catch (error) {
        console.error('File select error:', error);
        showError(`${t('err_detail')} ${error.message}`);
        elements.fileInfo.text(t('err_select_fail'));
        elements.processBtn.prop('disabled', true);
    }
};

const selectDirectory = async () => {
    try {
        if (!IS_FS_API_SUPPORTED) throw new Error(t('err_fs_unsupported'));
        state.directoryHandle = await window.showDirectoryPicker();
        state.useFileSystemAPI = true;
        try {
            state.dbDirectoryHandle = await state.directoryHandle.getDirectoryHandle('db');
        } catch (dbError) {
            throw new Error(t('err_folder_invalid'));
        }

        let hasCurrent = false;
        let hasManifest = false;
        for await (const entry of state.dbDirectoryHandle.values()) {
            if (entry.kind === 'file') {
                if (entry.name === 'CURRENT') hasCurrent = true;
                if (entry.name.startsWith('MANIFEST')) hasManifest = true;
            }
        }

        if (!hasCurrent || !hasManifest) {
            showError(t('err_folder_missing_files'), t('err_folder_invalid'));
            elements.fileInfo.text(t('err_folder_invalid'));
            elements.processBtn.prop('disabled', true);
            return;
        }

        state.currentFile = null;
        elements.fileInfo.text(`${t('word_selected_folder')}: ${state.directoryHandle.name}`);
        elements.processBtn.prop('disabled', false);
        setStatusHtml(t('js_folder_selected'));
        resetDecryptDownload();
        resetNbtState();
        openWindow('decryptorWindow');
    } catch (error) {
        console.error('Select folder error:', error);
        let errorMsg = t('err_folder_select_fail');
        if (error.name === 'AbortError') errorMsg += t('err_cancel');
        else if (error.name === 'SecurityError') errorMsg += t('err_security');
        else if (error.message.includes('not supported')) errorMsg += t('err_fs_unsupported');
        else errorMsg += error.message;
        showError(errorMsg);
        elements.fileInfo.text(t('err_select_fail'));
        elements.processBtn.prop('disabled', true);
    }
};

const processZipFile = async () => {
    if (!state.currentFile) throw new Error(t('err_no_file'));
    updateProgress(5, t('js_reading_zip'));

    let zip;
    try {
        zip = await window.JSZip.loadAsync(state.currentFile);
    } catch (zipError) {
        throw new Error(`${t('err_read_zip')}: ${zipError.message}`);
    }

    updateProgress(15, t('js_analyzing'));

    let currentFileEntry = null;
    let manifestFileEntry = null;
    const fileList = [];

    zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        fileList.push(zipEntry);
        if (isFileInDbFolder(relativePath)) {
            const fileName = zipEntry.name.split('/').pop();
            if (fileName === 'CURRENT') currentFileEntry = zipEntry;
            else if (fileName && fileName.startsWith('MANIFEST')) manifestFileEntry = zipEntry;
        }
    });

    if (!currentFileEntry) throw new Error(t('err_no_current'));
    if (!manifestFileEntry) throw new Error(t('err_no_manifest'));

    updateProgress(25, t('js_getting_key'));
    const currentFileData = await currentFileEntry.async('uint8array');

    if (!checkHeader(currentFileData, ENCRYPTION_HEADER)) {
        throw new Error(t('err_not_encrypted'));
    }

    const manifestName = manifestFileEntry.name.split('/').pop();
    const key = await getKey(currentFileData, manifestName);

    updateProgress(35, t('js_decrypting'));

    const newZip = new window.JSZip();
    let processedFiles = 0;
    const totalFiles = fileList.length;

    for (const zipEntry of fileList) {
        if (isFileInDbFolder(zipEntry.name)) {
            const fileData = await zipEntry.async('uint8array');
            if (checkHeader(fileData, ENCRYPTION_HEADER)) {
                newZip.file(zipEntry.name, decryptFile(fileData, key));
            } else {
                newZip.file(zipEntry.name, fileData);
            }
        } else {
            const fileBlob = await zipEntry.async('blob');
            newZip.file(zipEntry.name, fileBlob);
        }
        processedFiles++;
        updateProgress(35 + (processedFiles / totalFiles) * 55, `${t('word_processing_file')}: ${processedFiles}/${totalFiles}`);
    }

    state.zipObject = newZip;
    state.currentArchiveName = state.currentFile.name;

    updateProgress(90, t('js_generating_zip'));
    const content = await newZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    const url = URL.createObjectURL(content);
    state.decryptDownloadUrl = url;
    elements.downloadBtn.attr({
        href: url,
        download: deriveDecryptedArchiveName(state.currentFile.name)
    }).removeClass('hidden-btn');

    try {
        await extractAndParseLevelDat();
        setNbtStatusText(t('js_nbt_archive_ready'));
        elements.nbtFileInfo.text(`${t('word_selected')}: ${state.currentFile.name} (level.dat)`);
    } catch (error) {
        console.warn('level.dat extraction skipped:', error);
    }
};

const processDirectory = async () => {
    if (!state.dbDirectoryHandle) throw new Error(t('err_no_file'));
    updateProgress(5, t('js_scanning_folder'));

    let currentFileHandle = null;
    let manifestFileHandle = null;
    const dbFileHandles = [];

    for await (const entry of state.dbDirectoryHandle.values()) {
        if (entry.kind === 'file') {
            dbFileHandles.push(entry);
            if (entry.name === 'CURRENT') currentFileHandle = entry;
            if (entry.name.startsWith('MANIFEST')) manifestFileHandle = entry;
        }
    }

    if (!currentFileHandle) throw new Error(t('err_no_current'));
    if (!manifestFileHandle) throw new Error(t('err_no_manifest'));

    updateProgress(15, t('js_reading_enc'));
    const currentFile = await currentFileHandle.getFile();
    const currentFileData = new Uint8Array(await currentFile.arrayBuffer());

    if (!checkHeader(currentFileData, ENCRYPTION_HEADER)) {
        throw new Error(t('err_not_encrypted'));
    }

    updateProgress(25, t('js_getting_key'));
    const key = await getKey(currentFileData, manifestFileHandle.name);

    updateProgress(35, t('js_decrypting'));
    let processedFiles = 0;
    const totalFiles = dbFileHandles.length;

    for (const fileHandle of dbFileHandles) {
        const file = await fileHandle.getFile();
        const fileData = new Uint8Array(await file.arrayBuffer());
        if (checkHeader(fileData, ENCRYPTION_HEADER)) {
            const decryptedData = decryptFile(fileData, key);
            const writable = await fileHandle.createWritable();
            await writable.write(decryptedData);
            await writable.close();
        }
        processedFiles++;
        updateProgress(35 + (processedFiles / totalFiles) * 60, `${t('word_processing_file')}: ${processedFiles}/${totalFiles} (db)`);
    }

    try {
        await extractAndParseLevelDat();
    } catch (error) {
        console.warn('level.dat extraction skipped:', error);
    }

    updateProgress(100, t('js_folder_done'));
};

const startProcessing = async () => {
    if ((!state.currentFile && !state.directoryHandle) || state.isProcessing) return;

    setProcessing(true);
    updateProgress(0, t('js_initializing'));

    try {
        if (state.useFileSystemAPI) {
            await processDirectory();
        } else {
            await processZipFile();
        }

        updateProgress(100, t('js_done'));
        showSuccess(t('js_done_success'));

        if (!state.useFileSystemAPI) {
            elements.downloadBtn.removeClass('hidden-btn');
            elements.downloadBtn[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    } catch (error) {
        console.error('Processing error:', error);
        let errorDetail = `${t('err_detail')} ${error.message}`;
        if (error.message.includes('CURRENT') || error.message.includes(t('err_no_current'))) errorDetail = t('err_hint_current');
        else if (error.message.includes('MANIFEST') || error.message.includes(t('err_no_manifest'))) errorDetail = t('err_hint_manifest');
        else if (error.message.includes('加密') || error.message.includes('encrypted')) errorDetail = t('err_hint_unencrypted');
        else if (error.message.includes('ZIP') || error.message.includes('archive')) errorDetail = t('err_hint_zip_corrupt');
        showError(errorDetail);
        updateProgress(0, t('js_process_fail'));
    } finally {
        setProcessing(false);
    }
};

const openLoadedNbtEditor = () => {
    if (!state.levelDatData?.buffer) {
        showToast({ message: t('err_no_leveldat'), duration: 3000, type: 'error' });
        return;
    }

    try {
        state.nbtEditor = initNbtEditor('nbtContainer');
        state.nbtEditor.load(state.levelDatData.buffer);
        elements.nbtDialog.prop('open', true);
    } catch (error) {
        console.error('NBT open error:', error);
        showToast({ message: `${t('err_nbt_parse')}: ${error.message}`, duration: 5000, type: 'error' });
    }
};

const applyNbtChanges = async () => {
    if (!state.nbtEditor) return;

    elements.nbtSaveApply.prop('disabled', true).text(t('js_saving'));
    try {
        const fullBuffer = state.nbtEditor.save();
        state.levelDatData = new Uint8Array(fullBuffer);

        if (state.nbtSource === 'directory' && state.levelDatHandle) {
            const writable = await state.levelDatHandle.createWritable();
            await writable.write(state.levelDatData);
            await writable.close();
            setNbtStatusText(t('nbt_saved_folder'));
            showToast({ message: t('nbt_saved_folder'), duration: 3000 });
        } else if (state.nbtSource === 'zip' && state.zipObject) {
            state.zipObject.file('level.dat', state.levelDatData);
            const content = await state.zipObject.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            const url = URL.createObjectURL(content);
            if (state.nbtDownloadUrl) URL.revokeObjectURL(state.nbtDownloadUrl);
            state.nbtDownloadUrl = url;
            elements.nbtDownloadBtn.attr({
                href: url,
                download: deriveEditedNbtDownloadName()
            }).removeClass('hidden-btn');
            setNbtStatusText(t('nbt_saved_zip'));
            showToast({ message: t('nbt_saved_zip'), duration: 3000 });
        } else if (state.nbtSource === 'standalone') {
            const blob = new Blob([state.levelDatData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            if (state.nbtDownloadUrl) URL.revokeObjectURL(state.nbtDownloadUrl);
            state.nbtDownloadUrl = url;
            elements.nbtDownloadBtn.attr({
                href: url,
                download: deriveEditedNbtDownloadName()
            }).removeClass('hidden-btn');
            setNbtStatusText(t('nbt_saved_standalone'));
            showToast({ message: t('nbt_saved_standalone'), duration: 3000 });
        } else {
            throw new Error(t('err_no_leveldat'));
        }

        elements.nbtDialog.prop('open', false);
    } catch (error) {
        console.error('NBT save error:', error);
        showToast({ message: `${t('js_saving')} ${error.message}`, duration: 5000, type: 'error' });
    } finally {
        elements.nbtSaveApply.prop('disabled', false).text(t('btn_apply_close'));
    }
};

const bindDropArea = ($target, onDropFile) => {
    $target
        .on('dragover', (e) => {
            e.preventDefault();
            $target.addClass('dragover');
        })
        .on('dragleave', () => {
            $target.removeClass('dragover');
        })
        .on('drop', async (e) => {
            e.preventDefault();
            $target.removeClass('dragover');
            const files = e.originalEvent.dataTransfer?.files;
            if (files && files.length > 0) {
                await onDropFile(files[0]);
            }
        });
};

$(function () {
    i18n();
    setStatusText(t('status_waiting'));
    setNbtStatusText(t('nbt_status_waiting'));
    elements.fileInfo.text(t('file_info_empty'));
    elements.nbtFileInfo.text(t('file_info_empty'));
    setActiveWindow('decryptorWindow');

    if (IS_FS_API_SUPPORTED) {
        elements.fsApiBtn.css('display', 'inline-flex').removeClass('hidden-btn');
    } else {
        $('<div/>', {
            class: 'warning-text',
            html: t('err_fs_unsupported')
        }).appendTo(elements.apiNoteContainer);
    }

    elements.languageItems.on('click', function () {
        switchLanguage($(this).attr('data-lang'));
        if (!state.currentFile && !state.directoryHandle) {
            setStatusText(t('status_waiting'));
            elements.fileInfo.text(t('file_info_empty'));
        }
        if (!state.levelDatData) {
            setNbtStatusText(t('nbt_status_waiting'));
            elements.nbtFileInfo.text(t('file_info_empty'));
        }
        if (!state.isProcessing) {
            elements.processBtn.html(t('btn_start_decrypt'));
        }
        elements.nbtSaveApply.text(t('btn_apply_close'));
    });

    elements.windowLaunchers.on('click', function () {
        openWindow($(this).attr('data-open-window'));
    });

    elements.windowCloseButtons.on('click', function () {
        hideWindow($(this).attr('data-target-window'));
    });

    elements.windowMinimizeButtons.on('click', function () {
        hideWindow($(this).attr('data-target-window'));
    });

    elements.windowToggleButtons.on('click', function () {
        const target = $(this).attr('data-target-window');
        openWindow(target);
    });

    elements.decryptorWindow.on('mousedown', () => openWindow('decryptorWindow'));
    elements.nbtAppWindow.on('mousedown', () => openWindow('nbtAppWindow'));

    elements.aboutBtn.on('click', () => elements.aboutDialog.prop('open', true));
    elements.trayAboutBtn.on('click', () => elements.aboutDialog.prop('open', true));

    elements.browseBtn.on('click', () => {
        elements.fileInput.val('').trigger('click');
    });

    elements.browseNbtBtn.on('click', () => {
        elements.nbtFileInput.val('').trigger('click');
    });

    elements.fsApiBtn.on('click', selectDirectory);

    elements.fileInput.on('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleDecryptArchiveSelect(files[0]);
        }
    });

    elements.nbtFileInput.on('change', async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await handleNbtImport(files[0]);
        }
    });

    bindDropArea(elements.uploadArea, async (file) => {
        handleDecryptArchiveSelect(file);
    });

    bindDropArea(elements.nbtUploadArea, async (file) => {
        await handleNbtImport(file);
    });

    elements.processBtn.on('click', startProcessing);
    elements.openNbtBtn.on('click', () => {
        openWindow('nbtAppWindow');
        if (state.levelDatData?.buffer) {
            elements.nbtFileInfo.text(state.currentArchiveName
                ? `${t('word_selected')}: ${state.currentArchiveName} (level.dat)`
                : elements.nbtFileInfo.text());
        }
        openLoadedNbtEditor();
    });
    elements.launchNbtEditorBtn.on('click', openLoadedNbtEditor);
    elements.nbtSaveApply.on('click', applyNbtChanges);
});
