const entriesToObject = (entries, keyName, valueName) => {
    var result = {};

    for (var i = 0; i < entries.length; i++) {
        result[entries[i][keyName]] = entries[i][valueName];
    }

    return result;
}

module.exports = {
    entriesToObject
}