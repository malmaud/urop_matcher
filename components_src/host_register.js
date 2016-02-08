var React = require('react');

var HostForm = React.createClass({
  getInitialState: function() {
    return {'name': '', 'research': '', 'email': this.props.initialEmail, 'status': 'filling_out', errorMsg: ''};
  },

  getDefaultProps: function() {
    return {'initialEmail': ''};
  },

  render: function() {
    switch(this.state.status) {
      case 'filling_out':
        return this.get_form();
        break;
      case 'submitting':
        return (
          <p>Submitting...</p>
        );
        break;
      case 'submitted':
        return (
          <div className='alert alert-success'>
          Thanks for registering. Someone will need to approve your application before you can match with UROPs. You'll be redirected in 5 seconds.
          </div>
        );
        break;
    }
  },

  updateName: function(event) {
    this.setState({name: event.target.value});
  },

  updateEmail: function(event) {
    this.setState({email: event.target.value});
  },

  updateResearch: function(event) {
    this.setState({research: event.target.value});
  },

  onSubmit: function(event) {
    event.preventDefault();
    if(this.state.name.length == 0) {
      this.setState({errorMsg: "You need a name"});
    } else {
      this.setState({errorMsg: '', status: 'submitting'});
      let data = {name: this.state.name, email: this.state.email, research: this.state.research};
      $.ajax({
        url: '/host',
        method: 'post',
        data: JSON.stringify(data),
        success: result => {
          this.setState({status: 'submitted'});
          if(result.status == 'ok') {
            window.setTimeout(()=>location.assign('/dashboard'), 5000);
          }
        }
      });
    }
  },

  get_form: function() {
    let error_msg = <div/>
    if (this.state.errorMsg.length > 0) {
      error_msg =
        <div className='alert alert-danger'>
          {this.state.errorMsg}
        </div>
    }
    return (
      <div>
        {error_msg}
        <div className='page-header'>
          <h1>Register as a host</h1>
        </div>

        <form className='form-hoizontal' onSubmit={this.onSubmit}>
          <div className='form-group'>
            <label className='col-sm-2'>Name</label>
            <div className='col-sm-9'>
              <input type='text' className='form-control' name='name' placeholder="Preferred name" value={this.state.name} onChange={this.updateName}/>

            </div>
          </div>

          <div className='form-group'>
            <label className='col-sm-2'>Email</label>
            <div className='col-sm-9'>
              <input type='email' className='form-control' placeholder="Preferred email"  name="email" value={this.state.email} onChange={this.updateEmail}/>
            </div>
          </div>

          <div className='form-group'>
            <label className='col-sm-2'>Research description</label>
            <div className='col-sm-9'>
              <textarea className='form-control' rows="10" name="research" value={this.state.research} onChange={this.updateResearch}/>
            </div>
          </div>



          <div className='form-group'>
            <div className='col-sm-offset-2 col-sm-3'>
              <button type='submit' className='btn btn-default'>Submit</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

});

module.exports = {HostForm}
