let React = require('react');
let LinkedStateMixin = require('react-addons-linked-state-mixin');
let $ = require('jquery');

let MockForm = React.createClass({
  mixins: [LinkedStateMixin],

  getInitialState() {
    return {email: ''};
  },

  onSubmit(event) {
    event.preventDefault();
    console.log(this.state.email);
    let data = {email: this.state.email};
    $.ajax({
      method: 'post',
      url: '/_util/mock_login',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: res=>{
        console.log(res);
        location.replace('/');
      }
    });
  },

  render() {
    return (
      <form className='form-horizontal' onSubmit={this.onSubmit}>
        <div className='form-group'>
          <label className='col-sm-2'>Email</label>
          <div className='col-sm-10'>
            <input type='text' className='form-control' valueLink={this.linkState('email')}/>
          </div>
        </div>
        <div className='form-group'>
          <div className='col-sm-2'>
            <button className='btn btn-default'>Login</button>
          </div>
        </div>
      </form>
    );
  }
});

module.exports = MockForm;
