import i18next from 'i18next';

const resources = {
  'zh-CN': { translation: {
    'app.name': '简历编辑器', 'app.edit': '编辑', 'app.theme': '选择主题', 'app.language': '界面语言', 'app.pageSeparators': '分隔线', 'app.spacing': '排版', 'app.reset': '重置', 'app.export': '导出', 'app.hide': '隐藏', 'app.show': '展开',
    'image.title': '导出图片', 'image.format': '图片格式', 'image.png': 'PNG（无损）', 'image.jpeg': 'JPEG（体积更小）', 'image.scale': '清晰度', 'image.scale1': '标准（1×）', 'image.scale2': '高清（2×）', 'image.scale3': '超清（3×）', 'image.hint': '将导出为一张连续长图，不按 A4 分页截断。', 'image.cancel': '取消', 'image.export': '导出图片', 'image.failed': '图片导出失败：{{message}}',
    'export.title': '导出简历', 'export.type': '导出类型', 'export.pdf': 'PDF（A4 分页）', 'export.image': '图片（连续长图）', 'export.submit': '开始导出',
    'app.openJson': '打开 JSON 编辑器', 'app.closeJson': '关闭 JSON 编辑器', 'app.spacingTitle': '排版设置', 'app.spacingHint': '修改会实时反映在简历预览中', 'app.resetSpacing': '恢复默认排版', 'app.toolbarAria': '简历编辑工具栏', 'app.restoreAria': '展开编辑工具栏', 'app.restoreTitle': '展开编辑工具栏（Alt/Option + E）', 'app.printTitle': '打印或导出 PDF', 'app.pageSeparatorsTitle': '显示或隐藏预览分页分隔线',
    'version.select': '选择简历版本', 'version.newRoot': '新建根版本', 'version.newChild': '新建子版本', 'version.newTitle': '新建版本', 'version.copy': '复制版本', 'version.copyTitle': '复制版本', 'version.rename': '重命名版本', 'version.renameTitle': '重命名版本', 'version.delete': '删除版本', 'version.deleteConfirm': '确定删除“{{name}}”？删除前请确认它没有需要保留的内容。', 'version.deleteDisabled': '请先删除所有子版本', 'version.namePrompt': '请输入版本名称', 'version.nameLabel': '版本名称', 'version.parentLabel': '父节点', 'version.parentRoot': '根节点（无父节点）', 'version.cancel': '取消', 'version.confirm': '保存版本', 'version.copyName': '{{name}} 副本', 'version.createFailed': '版本创建失败：{{message}}', 'version.copyFailed': '版本复制失败：{{message}}', 'version.renameFailed': '版本重命名失败：{{message}}', 'version.deleteFailed': '版本删除失败：{{message}}', 'version.nameRequired': '版本名称不能为空', 'version.noChildren': '暂无子版本', 'version.createdAt': '创建', 'version.updatedAt': '修改', 'version.noDate': '未记录', 'version.operationSuccess': '版本已更新', 'version.expand': '展开', 'version.collapse': '折叠',
    'editor.title': 'JSON 编辑器', 'editor.subtitle': '合法 JSON 会实时更新右侧预览', 'editor.close': '关闭编辑器', 'editor.loaded': '已加载本地草稿', 'editor.contentAria': '简历 JSON 内容', 'editor.apply': '应用', 'editor.format': '格式化', 'editor.copy': '复制', 'editor.upload': '导入', 'editor.download': '下载', 'editor.reset': '恢复示例', 'editor.hint': '快捷键：⌘/Ctrl + Enter 应用 JSON', 'editor.resize': '调整编辑器宽度', 'editor.checking': '正在检查 JSON…', 'editor.live': '已实时更新预览', 'editor.applied': '已应用，预览已更新', 'editor.formatted': '已格式化', 'editor.copied': '已复制 JSON', 'editor.copyFailed': '复制失败，请手动复制', 'editor.downloaded': '已下载 JSON', 'editor.resetDone': '已恢复示例数据', 'editor.jsonError': 'JSON 错误：{{message}}', 'editor.dataError': '数据结构错误：{{message}}', 'editor.imported': '已导入 {{file}}',
    'section.basicInfo': '基本信息', 'section.summary': '个人优势', 'section.skills': '技能', 'section.work': '工作经历', 'section.projects': '项目经历', 'section.education': '教育背景', 'project.background': '项目背景', 'project.techStack': '技术栈', 'project.role': '项目职责',
  } },
  'en-US': { translation: {
    'app.name': 'Resume Editor', 'app.edit': 'Edit', 'app.theme': 'Theme', 'app.language': 'Language', 'app.pageSeparators': 'Page breaks', 'app.spacing': 'Layout', 'app.reset': 'Reset', 'app.export': 'Export', 'app.hide': 'Hide', 'app.show': 'Show',
    'image.title': 'Export image', 'image.format': 'Format', 'image.png': 'PNG (lossless)', 'image.jpeg': 'JPEG (smaller)', 'image.scale': 'Resolution', 'image.scale1': 'Standard (1×)', 'image.scale2': 'High (2×)', 'image.scale3': 'Ultra (3×)', 'image.hint': 'Exports one continuous image without A4 page breaks.', 'image.cancel': 'Cancel', 'image.export': 'Export image', 'image.failed': 'Image export failed: {{message}}',
    'export.title': 'Export resume', 'export.type': 'Export type', 'export.pdf': 'PDF (A4 pages)', 'export.image': 'Image (continuous)', 'export.submit': 'Export',
    'app.openJson': 'Open JSON editor', 'app.closeJson': 'Close JSON editor', 'app.spacingTitle': 'Layout settings', 'app.spacingHint': 'Changes are reflected in the preview instantly', 'app.resetSpacing': 'Reset layout', 'app.toolbarAria': 'Resume editor toolbar', 'app.restoreAria': 'Show resume editor toolbar', 'app.restoreTitle': 'Show toolbar (Alt/Option + E)', 'app.printTitle': 'Print or export PDF', 'app.pageSeparatorsTitle': 'Show or hide preview page boundaries',
    'version.select': 'Select resume version', 'version.newRoot': 'New root version', 'version.newChild': 'New child version', 'version.newTitle': 'New version', 'version.copy': 'Copy version', 'version.copyTitle': 'Copy version', 'version.rename': 'Rename version', 'version.renameTitle': 'Rename version', 'version.delete': 'Delete version', 'version.deleteConfirm': 'Delete “{{name}}”? Make sure it contains nothing you still need.', 'version.deleteDisabled': 'Delete child versions first', 'version.namePrompt': 'Enter a version name', 'version.nameLabel': 'Version name', 'version.parentLabel': 'Parent node', 'version.parentRoot': 'Root (no parent)', 'version.cancel': 'Cancel', 'version.confirm': 'Save version', 'version.copyName': '{{name}} copy', 'version.createFailed': 'Failed to create version: {{message}}', 'version.copyFailed': 'Failed to copy version: {{message}}', 'version.renameFailed': 'Failed to rename version: {{message}}', 'version.deleteFailed': 'Failed to delete version: {{message}}', 'version.nameRequired': 'Version name is required', 'version.noChildren': 'No child versions', 'version.createdAt': 'Created', 'version.updatedAt': 'Updated', 'version.noDate': 'Not recorded', 'version.operationSuccess': 'Version updated', 'version.expand': 'Expand', 'version.collapse': 'Collapse',
    'editor.title': 'JSON Editor', 'editor.subtitle': 'Valid JSON updates the preview in real time', 'editor.close': 'Close editor', 'editor.loaded': 'Local draft loaded', 'editor.contentAria': 'Resume JSON content', 'editor.apply': 'Apply', 'editor.format': 'Format', 'editor.copy': 'Copy', 'editor.upload': 'Import', 'editor.download': 'Download', 'editor.reset': 'Restore example', 'editor.hint': 'Shortcut: ⌘/Ctrl + Enter to apply JSON', 'editor.resize': 'Resize editor', 'editor.checking': 'Checking JSON…', 'editor.live': 'Preview updated', 'editor.applied': 'Applied; preview updated', 'editor.formatted': 'Formatted', 'editor.copied': 'JSON copied', 'editor.copyFailed': 'Copy failed; please copy manually', 'editor.downloaded': 'JSON downloaded', 'editor.resetDone': 'Example data restored', 'editor.jsonError': 'JSON error: {{message}}', 'editor.dataError': 'Data error: {{message}}', 'editor.imported': 'Imported {{file}}',
    'section.basicInfo': 'Contact', 'section.summary': 'Summary', 'section.skills': 'Skills', 'section.work': 'Experience', 'section.projects': 'Projects', 'section.education': 'Education', 'project.background': 'Background', 'project.techStack': 'Tech stack', 'project.role': 'Role',
  } },
};

function detectInitialLanguage() {
  try {
    const stored = localStorage.getItem('myresume2-ui-locale');
    if (stored === 'zh-CN' || stored === 'en-US') return stored;
  } catch { /* ignore */ }
  const browser = typeof navigator === 'undefined' ? '' : navigator.language || '';
  return browser.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

export const i18nReady = i18next.init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: 'zh-CN',
  supportedLngs: ['zh-CN', 'en-US'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initImmediate: false,
});

export const t = (locale, key, vars = {}) => i18next.t(key, { ...vars, lng: locale });
export const getInitialAppLocale = () => i18next.resolvedLanguage || i18next.language || 'zh-CN';
export const setAppLocale = locale => i18next.changeLanguage(locale);
export const getSupportedAppLocales = () => [{ code: 'zh-CN', label: '简体中文' }, { code: 'en-US', label: 'English' }];
