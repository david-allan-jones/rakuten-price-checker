const axios = require('axios')
const csvParser = require('csv-parse')
const fastCsv = require('fast-csv')
const jsdom = require('jsdom')

const inputPath = process.argv[2]
const outputPath = process.argv[3]

const loadInput = () => {
    return new Promise((resolve, reject) => {
        const itemList = []
        fs.createReadStream(inputPath)
            .pipe(csvParser())
            .on('data', (row) => itemList.push(row[Object.keys(row)[0]]))
            .on('end', () => resolve(itemList))
            .on('error', reject)
    })
}

const scrapeLowestPriceFromRakuten = async (item) => {
    return '1'
}

const fetchPrices = async (itemList) => {
    const priceList = []
    itemList.forEach((item) => {
        const price = await scrapeLowestPriceFromRakuten(item)
        priceList.push([[item, price]])
    })
    return priceList
}

const writeToOutputFile = (priceList) => {
    return new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(outputPath)
        fastCsv.write(priceList, { headers: false })
            .pipe(ws)
            .on('finish', resolve)
            .on('error', reject)
    })
}
loadInput()
    .then((itemList) => fetchPrices(itemList))
    .then((priceList) => writeToOutputFile(priceList))