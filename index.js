var blockstream = require('./lib/blockstream')
var toTxs = require('./lib/toTxs')
var dataTxsOnly = require('./lib/dataTxsOnly')
var txsForAddresses = require('./lib/txsForAddresses')
var getData = require('./lib/getData')
var combine = require('stream-combiner2').obj

function txstream (options) {
  return options.addresses ? txsForAddresses(options) : combine(
    blockstream(options),
    toTxs()
  )
}

function datatxstream (options) {
  return combine(
    txstream(options),
    dataTxsOnly()
  )
}

function datastream (options) {
  return combine(
    datatxstream(options),
    getData()
  )
}

module.exports = {
  stream: {
    blocks: blockstream,
    txs: txstream,
    dataTxs: datatxstream,
    data: datastream
  },
  filter: {
    data: dataTxsOnly
  },
  map: {
    data: getData
  }
}
