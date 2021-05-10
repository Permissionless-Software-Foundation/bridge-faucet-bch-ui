import React from 'react'
import { Row, Col, Box, Button } from 'adminlte-2-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './faucet.css'
const axios = require('axios').default

let _this
class FaucetComponent extends React.Component {
  constructor (props) {
    super(props)
    _this = this
    this.state = {
      address: '',
      errMsg: '',
      txId: '',
      inFetch: false,
      explorerURL: ''
    }
    this.requestTimeoout = 10000
    this.faucetUrl = 'https://bridge-faucet.fullstackcash.nl/faucet/slptoken'
  }

  render () {
    return (
      <div className='faucet-container'>
        <Row className='faucet-content'>
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
                      icon='faucet'
                    />
                    <span>Faucet</span>
                  </h1>
                </Col>

                <Col sm={12} className='text-center mb-2 mt-2'>
                  <Button
                    text='Get a Token!'
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
                <Col sm={12} className='text-center'>
                  {_this.state.txId && (
                    <a
                      target='_blank'
                      rel='noopener noreferrer'
                      href={`${_this.state.explorerURL}/${_this.state.txId}`}
                    >
                      Transaction ID: {_this.state.txId}
                    </a>
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
    _this.defineExplorer()
  }

  handleUpdate (event) {
    const value = event.target.value
    _this.setState({
      [event.target.name]: value
    })
  }

  async handleSubmit () {
    try {
      // Get bchAddress from  wallet
      const { cashAddress } = _this.props.walletInfo
      if (!cashAddress) {
        throw new Error('Wallet not found!')
      }
      // Set default values
      _this.setState({
        inFetch: true,
        txId: '',
        errMsg: ''
      })

      await _this.sleep(_this.requestTimeoout)

      // Request option
      const options = {
        method: 'GET',
        url: `${_this.faucetUrl}/${cashAddress}`,
        headers: {
          Accept: 'application/json'
        }
      }
      const result = await axios(options)
      console.log('Faucet result : ', result.data)
      _this.setState({
        inFetch: false,
        txId: result.data.txid
      })
    } catch (error) {
      console.warn(error)
      _this.setState({
        errMsg: error.message,
        inFetch: false
      })
    }
  }

  // Define the explorer to use
  // depending on the selected chain
  defineExplorer () {
    try {
      const bchWalletLib = _this.props.bchWallet
      const bchjs = bchWalletLib.bchjs

      let explorerURL

      if (bchjs.restURL.includes('abc.fullstack')) {
        explorerURL = 'https://explorer.bitcoinabc.org/tx'
      } else {
        explorerURL = 'https://explorer.bitcoin.com/bch/tx'
      }
      _this.setState({
        explorerURL
      })
    } catch (error) {
      console.warn('bchWallet not found!')
    }
  }

  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default FaucetComponent
