'use strict'

var typeforce = require('typeforce')
var debug = require('debug')('txsForAddresses')
var Readable = require('readable-stream')
var bitcoin = require('bitcoinjs-lib')
var deepEqual = require('deep-equal')
var noop = function () {}

/**
 *  options             {object} (optional)
 *  options.addresses   {Array} array of addresses
 *  options.height {Number} (optional, default: undefined) starting height
 */
module.exports = function txstream (options) {
  typeforce({
    api: 'Object',
    addresses: 'Array'
  }, options)

  var blockchain = options.api
  var live = options.live

  var stream = new Readable({
    objectMode: true
  })

  stream.close = function () {
    this.push(null)
  }

  stream.once('end', function () {
    clearInterval(interval)
  })

  stream._read = noop

  var interval
  var lastBlock = []
  var lastHeight = options.height || 0

  fetch()

  if (live) {
    interval = setInterval(fetch, options.interval || 60000)
  }

  return stream

  function fetch () {
    blockchain.addresses.transactions(options.addresses, lastHeight, function (err, txs) {
      if (err) return debug(err)

      if (live) {
        var maxHeight = txs.reduce(function (h, tx) {
          return Math.max(h, tx.blockHeight)
        }, lastHeight)

        txs = txs.filter(function (tx) {
          if (tx.blockHeight < lastHeight) return

          return lastBlock.every(function (saved) {
            return !deepEqual(saved, tx)
          })
        })

        lastBlock = lastBlock.filter(function (tx) {
          return tx.blockHeight === maxHeight
        })

        txs.forEach(function (tx) {
          if (tx.blockHeight === maxHeight) {
            lastBlock.push(tx)
          }
        })

        lastHeight = maxHeight
      }

      txs.forEach(function (txInfo) {
        stream.push({
          height: txInfo.blockHeight,
          blockId: txInfo.blockId,
          confirmations: txInfo.__confirmations,
          tx: bitcoin.Transaction.fromHex(txInfo.txHex)
        })
      })

      if (!live) stream.close()
    })
  }
}