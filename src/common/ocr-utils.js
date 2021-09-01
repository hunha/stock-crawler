const Tesseract = require('tesseract.js');

const recognize = async (path, language) => {
    try {
        const result = await Tesseract.recognize(
            path,
            'vie',
            { logger: m => console.log(m) }
        );

        return result.data.text;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    recognize
}