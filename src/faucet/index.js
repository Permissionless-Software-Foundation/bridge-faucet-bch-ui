import React from 'react'
import { Row, Col, Box, Button, Inputs } from 'adminlte-2-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './faucet.css'
const { Text } = Inputs
let _this
class FaucetComponent extends React.Component {
  constructor (props) {
    super(props)
    _this = this
    this.state = {
      address: '',
      errMsg: ''
    }
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

  handleUpdate (event) {
    const value = event.target.value
    _this.setState({
      [event.target.name]: value
    })
  }

  handleSubmit () {
    try {
      const { address } = _this.state
      console.log('Address', address)
    } catch (error) {
      console.warn(error)
    }
  }
}

export default FaucetComponent
