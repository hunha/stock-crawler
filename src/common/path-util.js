
const isFile = (name) => {
    return /.+\..+/g.test(name);
}

const getName = (fileName) => {
    return fileName.substring(0, fileName.indexOf('.'));
}

module.exports = {
    isFile,
    getName
}