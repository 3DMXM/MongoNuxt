// 简化的 toast 替换映射
const toastReplacements = [
    // 成功消息
    [/toast\.add\(\s*{\s*title:\s*["']连接成功["'],[\s\S]*?color:\s*["']success["'],?\s*}\s*\);?/g, "ElMessage.success('已成功连接到 MongoDB');"],
    [/toast\.add\(\s*{\s*title:\s*["']数据库已选择["'],[\s\S]*?color:\s*["']info["'],?\s*}\s*\);?/g, "ElMessage.info('已切换到数据库：' + db);"],
    [/toast\.add\(\s*{\s*title:\s*["']集合已选择["'],[\s\S]*?color:\s*["']info["'],?\s*}\s*\);?/g, "ElMessage.info('已加载文档');"],
    [/toast\.add\(\s*{\s*title:\s*["']刷新成功["'],[\s\S]*?color:\s*["']success["'],?\s*}\s*\);?/g, "ElMessage.success('已重新加载文档');"],
    [/toast\.add\(\s*{\s*title:\s*["']已断开连接["'],[\s\S]*?color:\s*["']info["'],?\s*}\s*\);?/g, "ElMessage.info('与数据库的连接已断开');"],

    // 错误消息
    [/toast\.add\(\s*{\s*title:\s*["']连接失败["'],[\s\S]*?color:\s*["']error["'],?\s*}\s*\);?/g, "ElMessage.error(result.error || '无法连接到数据库');"],
    [/toast\.add\(\s*{\s*title:\s*["']获取集合失败["'],[\s\S]*?color:\s*["']error["'],?\s*}\s*\);?/g, "ElMessage.error(error.message || '无法获取集合列表');"],
    [/toast\.add\(\s*{\s*title:\s*["']获取文档失败["'],[\s\S]*?color:\s*["']error["'],?\s*}\s*\);?/g, "ElMessage.error(error.message || '无法获取文档列表');"],
    [/toast\.add\(\s*{\s*title:\s*["']刷新失败["'],[\s\S]*?color:\s*["']error["'],?\s*}\s*\);?/g, "ElMessage.error(error.message || '无法刷新文档');"],
];

console.log('Toast replacement patterns ready');
