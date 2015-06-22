# cb-streams

stream-based interface to [common-blockchain](https://github.com/common-blockchain/common-blockchain) API

_this module is used by [Tradle](https://github.com/tradle/about/wiki)_

# Usage

```js
var through2 = require('through2')
var cbstreams = require('cb-streams')
var Blockchain = require('cb-blockr')
var blockchain = new Blockchain('testnet')

// 1. Specify which blocks to read 

// block stream

var blockstream = cbstreams.stream.blocks({
    networkName: 'testnet',
    api: blockchain  
  })
  .pipe(through2.obj(function (blockInfo, enc, done) {
    var block = blockInfo.block
    // i want to do bad things to tx
  }))

for (var i = 0; i < 10; i++) {
  blockstream.write(i) // push block numbers into the stream
}

// tx stream

var txstream = cbstreams.stream.txs({
    networkName: 'testnet',
    api: blockchain
  })
  .pipe(through2.obj(function (txInfo, enc, done) {
    var tx = txInfo.tx
    // i want to do bad things to tx
  }))

for (var i = 0; i < 10; i++) {
  txstream.write(i) // push block numbers into the stream
}

// similarly you have:
// 
// cbstreams.stream.dataTxs which will return only txs with OP_RETURN data
// cbstreams.stream.data which will return wrapped OP_RETURN data: 
// {
//   data: data,
//   tx: tx,
//   height: height // block height
// }


// 2. Specify which "addresses" to watch

var stream = cbstreams.stream.txs({
    networkName: 'testnet',
    api: blockchain,
    addresses: [
      'mvQx4yPAAzvZipC8mFWK1QUfPz1CNfnaBL', 
      'mk96Ff5754KUT7EGNKhvnTSdMpaPkuKU1N'
    ],
    // stream will go on forever (as new transactions are put on blockchain)
    live: true
  })
  .pipe(through2.obj(function (txInfo, enc, done) {
    var tx = txInfo.tx
    // i want to do bad things to tx
  }))

```
