var React = require('react');
var LinkedStateMixin = require('react-addons-linked-state-mixin');
let $ = require('jquery');

var FeedbackForm = React.createClass({
  mixins: [LinkedStateMixin],

  getDefaultProps() {
    return {user: null};
  },

  getInitialState() {
    return {feedback: '', anonymous: false, status:'filling_out'};
  },

  onSubmit(event) {
    event.preventDefault();
    let data = {};
    if(!this.state.anonymous) {
      data.user_id = this.props.user.data.user_id;
    }
    data.feedback = this.state.feedback;
    console.log(data);
    this.setState({status: 'submitting'});
    console.log('posting feedback request');
    $.ajax({
      method: 'post',
      url: '/api/feedback',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: res=>{
        console.log(res);
        this.setState({status: 'submitted'});
      }
    });
  },

  render() {
    let status = this.state.status;
    if(status == 'submitted') {
      return (
        <div className='alert alert-success'>
          Thanks for the feedback!
        </div>
      );
    }
    let submit_button;
    switch(status) {
      case 'filling_out':
      submit_button = <button type='submit' className='btn btn-success'>Submit</button>;
      break;
      case 'submitting':
      submit_button = <button className='btn btn-success' disabled='disabled'>Submitting...</button>;
      break;
    }
    return (
      <div>
        <div className='page-header'>
          <h1>Submit feedback</h1>
        </div>
        <form className='form-horizontal' onSubmit={this.onSubmit}>
          <div className='form-group'>
            <label className='col-sm-2'>Feedback:</label>
            <div className='col-sm-10'>
              <textarea rows="10" className='form-control' valueLink={this.linkState('feedback')}/>
            </div>
          </div>
          <div className='form-group'>
            <div className='checkbox'>
              <label><input type='checkbox' checkedLink={this.linkState('anonymous')}/>Submit anonymously</label>
            </div>
          </div>
          <div className='form-group'>
            <button type='submit' className='btn btn-success'>Submit</button>
          </div>
        </form>
      </div>
    );
  }
});

module.exports = {FeedbackForm};
