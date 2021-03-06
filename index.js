const axios = require('axios')
const csvParser = require('csv-parse')
const fastCsv = require('fast-csv')
const jsdom = require('jsdom')
const fs = require('fs')

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
    const response = await axios.get(`https://search.rakuten.co.jp/search/mall/${item}+/?s=2`)
    const dom = new jsdom.JSDOM(response.data)
    const nodes = dom.window.document.querySelectorAll('.content.description.price')

    let lowest = { total: Number.MAX_SAFE_INTEGER }
    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i]
        try {
            const priceNode = currentNode.querySelector('span.important')
            const price = parseInt(priceNode.innerHTML.replace('<small>円</small>', '').replace(',', ''))

            const shippingNode = currentNode.querySelector('span.with-help span')
            if (shippingNode === null) continue;
            const shippingCost = (shippingNode.innerHTML === '送料無料')
                ? 0
                : parseInt(shippingNode.innerHTML.replace('+送料', '').replace('円', '').replace(',', ''))

            const totalPrice = price + shippingCost
            if (totalPrice < lowest.total) {
                lowest = { total: totalPrice, price, shippingCost }
            }
        } catch (e) {
            return { total: '~', price: '~', shippingCost: '~' }
        }
    }

    return lowest
}

const fetchPrices = async (itemList) => {
    const priceList = []
    for (let i = 0; i < itemList.length; i++) {
        let item = itemList[i]
        const lowest = await scrapeLowestPriceFromRakuten(item)
        try {
            priceList.push([
                item,
                lowest.price.toString(),
                lowest.shippingCost.toString(),
                lowest.total.toString()
            ])
        } catch (e) {
            priceList.push([
                item,
                '~',
                '~',
                '~'
            ])
        }
    }
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