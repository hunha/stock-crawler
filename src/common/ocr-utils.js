const Tesseract = require('tesseract.js');

const recognize = async (path, language) => {
    const result = await Tesseract.recognize(
        path,
        'vie',
        { logger: m => console.log(m) }
    );

    return result.data.text;
}

module.exports = {
    recognize
}