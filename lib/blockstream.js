'use strict'

var typeforce = require('typeforce')
var through2 = require('through2')
var bitcoin = require('@tradle/bitcoinjs-lib')
var throttle = require('throttleme')
var combine = require('stream-combiner2').obj

/**
 *  options             {Object}
 *  options.api         {Object} common-blockchain API
 *  options.batchSize   {Number} (optional, default: 20)
 *    how many blocks to ask for in a request to whatever the provider is
 *  options.throttle    {Number} (optional, default: 2000)
 *    how many milliseconds to wait between requests
 */
module.exports = function blockstream (options) {
  typeforce({
    api: 'Object'
  }, options)

  var batchSize = options.batchSize || 20
  var blockchain = options.api
  var processBatch = throttle(unthrottledProcessBatch, options.throttle || 500)
  var batcher = through2.obj({
    highWaterMark: batchSize
  }, function transform (heights, enc, done) {
    heights = [].concat(heights).slice()
    while (heights.length) {
      var size = Math.min(batchSize, heights.length)
      this.push(heights.slice(0, size))
      heights = heights.slice(size)
    }

    done()
  })

  var stream = through2.obj({
    highWaterMark: batchSize
  }, function transform (batch, enc, done) {
    processBatch(batch, done)
  })

  return combine(
    batcher,
    stream
  )

  function unthrottledProcessBatch (heights, cb) {
    // var sorted = tasks.sort(function (a, b) {
    //   return a.height - b.height
    // })

    blockchain.blocks.get(heights, function (err, blocks) {
      if (err) return cb(err)

      heights.forEach(function (h, i) {
        // var idx = sorted.indexOf(task)
        var block = blocks[i]
        if (typeof block === 'string') {
          block = bitcoin.Block.fromHex(block)
        } else if (Buffer.isBuffer(block)) {
          block = bitcoin.Block.fromBuffer(block)
        } else if (!block.toHex) {
          stream.emit('error', new Error('invalid block: ' + block), h)
          return
        }

        stream.push({
          height: h,
          block: block
        })
      })

      cb()
    })
  }
}
