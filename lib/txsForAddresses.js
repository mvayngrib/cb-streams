'use strict'

// var TxGraph = require('bitcoin-tx-graph')
var typeforce = require('typeforce')
var debug = require('debug')('txsForAddresses')
var Readable = require('readable-stream')
var bitcoin = require('bitcoinjs-lib')
// var deepEqual = require('deep-equal')
var noop = function () {}

/**
 *  options             {object} (optional)
 *  options.addresses   {Array} array of addresses
 *  options.height {Number} (optional, default: undefined) starting height,
 *  options.confirmations {Number} (optional, default: 10) stop receiving updates
 *    after this many confirmations
 */
module.exports = function txstream (options) {
  typeforce({
    api: 'Object',
    addresses: 'Array'
  }, options)

  var maxConfirmations = options.confirmations || 10
  var blockchain = options.api
  var live = options.live

  var stream = new Readable({
    objectMode: true
  })

  stream.close = function () {
    this.push(null)
  }

  stream.once('end', function () {
    clearTimeout(timeout)
  })

  stream._read = noop
  stream.resume = function () {
    var ret = Readable.prototype.resume.call(this)
    if (fetchOnResumed) fetch()
    return ret
  }

  var fetchOnResumed
  var timeout
  var interval = options.interval || 60000
  var lastHeight = options.height || 0

  fetch()

  return stream

  function fetch () {
    if (stream.isPaused()) {
      fetchOnResumed = true
      return
    }

    debug('fetching txs')
    blockchain.addresses.transactions(options.addresses, lastHeight, function (err, txs) {
      if (live) {
        timeout = setTimeout(fetch, interval)
      }

      if (err) {
        if (!live) stream.emit('error', err)
        return debug(err)
      }

      txs = txs.filter(function (tx) {
        // keep unknown height txs and txs at and above specified height
        return typeof tx.blockHeight !== 'number' || tx.blockHeight >= lastHeight
      })

      // TODO: use tx-graph to provide transactions in order independent->dependent
      txs.sort(function (a, b) {
        var ah = a.blockHeight == null ? Infinity : a.blockHeight
        var bh = b.blockHeight == null ? Infinity : b.blockHeight
        return ah < bh ? -1 : 1
      })

      // var graph = new TxGraph()
      // txs.forEach(function (tx) {
      //   graph.addTx(bitcoin.Transaction.fromHex(tx.txHex))
      // })

      // var heads = graph.heads
      // var inOrder = [].concat.apply([], graph.heads.map(inOrderTraverse))
      //   .map(function (node) {
      //     return node.id
      //   })

      // var txsInOrder = idOrder.map(function (id) {
      //   var idx
      //   txs.some(function (tx, i) {
      //     if (id === tx.txId) {
      //       idx = i
      //       return true
      //     }
      //   })

      //   return txs[idx]
      // })

      // txs = txsInOrder

      if (live) {
        var maxHeight = txs.reduce(function (h, tx) {
          return Math.max(h, tx.blockHeight || 0)
        }, 0)

        // adjust height to run search from
        // based on number of confirmations desired
        var diff = maxHeight - lastHeight
        if (diff > maxConfirmations) {
          lastHeight += diff - maxConfirmations
        }
      }

      txs.forEach(function (txInfo) {
        stream.push({
          height: txInfo.blockHeight,
          blockId: txInfo.blockId,
          confirmations: txInfo.__confirmations,
          blockTimestamp: txInfo.__blockTimestamp,
          tx: bitcoin.Transaction.fromHex(txInfo.txHex)
        })
      })

      if (!live) stream.close()
    })

    // function atMaxHeight (maxHeight, tx) {
    //   return typeof tx.blockHeight === 'undefined' || tx.blockHeight === maxHeight
    // }
  }
}

// function inOrderTraverse (node) {
//   var stack = []
//   var current = node;
//   while (current || stack.length){
//     if (current) {
//       stack.push(current);
//       current = current.prevNodes;
//     } else if(!stack.isEmpty()) {
//       current = stack.pop();
//       process(current);
//       current = current.right;
//     }
//   }
// }
