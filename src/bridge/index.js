import React from 'react'
import { Row, Col, Box, Button, Inputs } from 'adminlte-2-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './bridge.css'
const { Text } = Inputs
let _this
class BridgeComponent extends React.Component {
  constructor (props) {
    super(props)
    _this = this
    this.state = {
      address: '',
      errMsg: '',
      qtyToSend: 1,
      txIds: [],
      inFetch: false
    }
    this.TIMEOUT = 10000 // timeout between transactions

    this.bridgeAddress =
      'bitcoincash:qrmjjjhz0a7dhp46ymw36l9zd0wcfryahq3s4989yj'

    this.TOKENID =
      'c7cb019764df3a352d9433749330b4b2eb022d8fbc101e68a6943a7a58a8ee84'

    this.bchjs = null // bchjs instance
  }

  render () {
    return (
      <div className='bridge-container'>
        <Row className='bridge-content'>
          <Col sm={2} />
          <Col sm={8}>
            <Box
              className='hover-shadow border-none mt-2'
              loaded={!_this.state.inFetch}
            >
              <Row>
                <Col sm={12} className='text-center'>
                  <h1>
                    <FontAwesomeIcon
                      className='title-icon'
                      size='xs'
                      icon='road'
                    />
                    <span>Bridge</span>
                  </h1>
                </Col>
                <Col sm={12} className='text-center mt-2 mb-2'>
                  <Row className='flex justify-content-center'>
                    <Col sm={10}>
                      <div>
                        <Text
                          id='address'
                          name='address'
                          placeholder='Address'
                          label='Address'
                          labelPosition='above'
                          onChange={_this.handleUpdate}
                        />
                      </div>
                    </Col>
                  </Row>
                </Col>
                <Col sm={12} className='text-center'>
                  {_this.state.txIds.map(val => {
                    return (
                      <p key={val} className=''>
                        Transaction ID:
                        <a
                          target='_blank'
                          rel='noopener noreferrer'
                          href={`https://explorer.bitcoin.com/bch/tx/${val}`}
                        >
                          {val}
                        </a>
                      </p>
                    )
                  })}
                </Col>
                <Col sm={12} className='text-center mb-2'>
                  <Button
                    text='Submit'
                    type='primary'
                    className='btn-lg'
                    onClick={_this.handleSubmit}
                  />
                </Col>
                <Col sm={12} className='text-center'>
                  {_this.state.errMsg && (
                    <p className='error-color'>{_this.state.errMsg}</p>
                  )}
                </Col>
              </Row>
            </Box>
          </Col>
          <Col sm={2} />
        </Row>
      </div>
    )
  }

  componentDidMount () {
    const { bchWallet } = _this.props
    if (bchWallet && bchWallet.bchjs) _this.bchjs = bchWallet.bchjs
  }

  handleUpdate (event) {
    const value = event.target.value
    _this.setState({
      [event.target.name]: value
    })
  }

  async handleSubmit () {
    try {
      const { bchWallet, walletInfo } = _this.props
      if (!bchWallet || !walletInfo) throw new Error('Wallet not found!')
      _this.setState({ inFetch: true }) //  switch spinner

      // Build Transactions
      const { roothex, memohex, slphex } = await _this.slpToAvax()
      // Broadcast the first Tx
      const firstTxId = await _this.broadCastTx(roothex)
      await _this.sleep(_this.TIMEOUT)

      // Broadcast the second Tx
      const secondTxId = await _this.broadCastTx(memohex)
      await _this.sleep(_this.TIMEOUT)

      // Broadcast the thrid Tx
      const thirdTxId = await _this.broadCastTx(slphex)

      _this.setState({
        txIds: [firstTxId, secondTxId, thirdTxId],
        inFetch: false,
        errMsg: ''
      })
    } catch (error) {
      console.warn(error)
      _this.setState({
        txIds: [],
        errMsg: error.message,
        inFetch: false
      })
    }
  }

  async slpToAvax () {
    try {
      // Address To Send
      const { address } = _this.state.address
      // Wallet Info
      const { bchWallet, walletInfo } = _this.props
      const { cashAddress, privateKey } = walletInfo
      // Amount To Send
      const amount = _this.state.qtyToSend

      const ecPair = _this.bchjs.ECPair.fromWIF(privateKey)

      // Utxos
      const bchUtxos = bchWallet.utxos.utxoStore.bchUtxos
      const slpUtxos = bchWallet.utxos.utxoStore.slpUtxos.type1.tokens

      // console.log('bchUtxos', bchUtxos)
      // console.log('slpUtxos', slpUtxos)

      // Filter out the token UTXOs that match the user-provided token ID.
      const tokenUtxos = slpUtxos.filter(
        utxo =>
          Boolean(utxo) && // UTXO is associated with a token.
          utxo.tokenId === _this.TOKENID && // UTXO matches the token ID.
          utxo.utxoType === 'token' // UTXO is not a minting baton.
      )
      // console.log('tokenUtxos', tokenUtxos)

      if (!bchUtxos.length) {
        throw new Error('No Utxos to spend')
      }

      const bchUtxo = await _this.findBiggestUtxo(bchUtxos)
      const dustAmount = 546
      const txFee = 500
      const slpAmount = dustAmount * 2 + txFee + 1
      const memoAmount = dustAmount + txFee + 1

      // instance of transaction builder for the first tx
      const firstBuilder = new _this.bchjs.TransactionBuilder()
      const originalAmount = Number(bchUtxo.value)
      const vout = bchUtxo.tx_pos
      const txid = bchUtxo.tx_hash
      const remainder = originalAmount - txFee - slpAmount - memoAmount // since we're running three txs

      if (remainder < 1) {
        throw new Error('Selected UTXO does not have enough satoshis')
      }

      firstBuilder.addInput(txid, vout)

      firstBuilder.addOutput(
        _this.bchjs.Address.toLegacyAddress(cashAddress),
        slpAmount
      )
      firstBuilder.addOutput(
        _this.bchjs.Address.toLegacyAddress(cashAddress),
        memoAmount
      )
      firstBuilder.addOutput(
        _this.bchjs.Address.toLegacyAddress(cashAddress),
        remainder
      )

      let firstRedeemScript
      firstBuilder.sign(
        0,
        ecPair,
        firstRedeemScript,
        firstBuilder.hashTypes.SIGHASH_ALL,
        originalAmount
      )
      const rootTx = firstBuilder.build()
      const rootTxid = rootTx.getId()

      // instance of transaction builder for the slp tx
      // Generate the OP_RETURN code.
      const slpSendObj = _this.bchjs.SLP.TokenType1.generateSendOpReturn(
        tokenUtxos,
        amount
      )

      const slpData = slpSendObj.script
      const secondBuilder = new _this.bchjs.TransactionBuilder()

      secondBuilder.addInput(rootTxid, 0)
      // add each token UTXO as an input.
      for (let i = 0; i < tokenUtxos.length; i++) {
        secondBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos)
      }

      secondBuilder.addOutput(slpData, 0)
      // Send dust transaction representing tokens being sent.
      secondBuilder.addOutput(
        _this.bchjs.SLP.Address.toLegacyAddress(_this.bridgeAddress),
        dustAmount
      )
      // Return any token change back to the sender.
      if (slpSendObj.outputs > 1) {
        secondBuilder.addOutput(
          _this.bchjs.SLP.Address.toLegacyAddress(cashAddress),
          dustAmount
        )
      }

      let secondRedeemScript
      secondBuilder.sign(
        0,
        ecPair,
        secondRedeemScript,
        secondBuilder.hashTypes.SIGHASH_ALL,
        slpAmount
      )
      // Sign each token UTXO being consumed.
      for (let i = 0; i < tokenUtxos.length; i++) {
        const thisUtxo = tokenUtxos[i]

        secondBuilder.sign(
          1 + i,
          ecPair,
          secondRedeemScript,
          secondBuilder.hashTypes.SIGHASH_ALL,
          thisUtxo.value
        )
      }

      const slptx = secondBuilder.build()
      const slptxId = slptx.getId()

      // instance of transaction builder for the tx with the op return
      const thirdBuilder = new _this.bchjs.TransactionBuilder()

      thirdBuilder.addInput(rootTxid, 1)

      // Add the OP_RETURN to the transaction.
      const script = [
        _this.bchjs.Script.opcodes.OP_RETURN,
        Buffer.from('6d02', 'hex'), // Makes message comply with the memo.cash protocol.
        Buffer.from(`avax ${address} ${slptxId}`)
      ]

      // Compile the script array into a bitcoin-compliant hex encoded string.
      const data = _this.bchjs.Script.encode(script)

      // Add the OP_RETURN output.
      thirdBuilder.addOutput(data, 0)
      thirdBuilder.addOutput(
        _this.bchjs.SLP.Address.toLegacyAddress(_this.bridgeAddress),
        dustAmount
      )

      // Sign the transaction with the HD node.
      let thirdRedeemScript
      thirdBuilder.sign(
        0,
        ecPair,
        thirdRedeemScript,
        thirdBuilder.hashTypes.SIGHASH_ALL,
        memoAmount
      )

      // build tx
      const memotx = thirdBuilder.build()

      // hex transaction
      const roothex = rootTx.toHex()
      // hex transaction
      const memohex = memotx.toHex()
      // hex transaction
      const slphex = slptx.toHex()

      return {
        roothex,
        memohex,
        slphex
      }
    } catch (error) {
      console.warn(error)
      throw error
    }
  }

  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async findBiggestUtxo (utxos) {
    if (!Array.isArray(utxos)) throw new Error('utxos needs to be an array')
    let largestAmount = 0
    let largestIndex = 0

    for (let i = 0; i < utxos.length; i++) {
      const thisUtxo = utxos[i]

      if (thisUtxo.value > largestAmount) {
        // Ask the full node to validate the UTXO. Skip if invalid.
        const isValid = await _this.bchjs.Blockchain.getTxOut(
          thisUtxo.tx_hash,
          thisUtxo.tx_pos
        )
        if (isValid === null) continue

        largestAmount = thisUtxo.value
        largestIndex = i
      }
    }

    return utxos[largestIndex]
  }

  async broadCastTx (hex) {
    try {
      const txid = await _this.bchjs.RawTransactions.sendRawTransaction(hex)
      console.log(`Transaction ID: ${txid}`)
      console.log(`https://explorer.bitcoin.com/bch/tx/${txid}`)
      return txid
    } catch (error) {
      console.warn('Error in broadCastTx', error.message)
      throw error
    }
  }
}

export default BridgeComponent
