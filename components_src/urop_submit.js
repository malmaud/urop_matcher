function get_first_name(name) {
  return name.split(' ')[0];
}

var UROPForm = React.createClass({
  getDefaultProps: function() {
    return {initialEmail: ''};
  },

  getInitialState: function() {
    return {'status': 'filling_out', 'name': '', 'email': this.props.initialEmail, 'emailConfirm': this.props.initialEmail, 'statement': '', 'errorMsg': ''};
  },

  render: function() {
    status = this.state.status
    if (status=="filling_out") {
      return this.get_form();
    } else if (status=="submitting") {
      return (
        <p>Submitting...</p>
      )
    } else if (status=="submitted") {
      return (
        <div className='alert alert-success'>Thanks {get_first_name(this.state.name)}, your form has been received.</div>
      );
    }
  },

  onSubmit: function(e) {
    e.preventDefault();
    if (this.state.email != this.state.emailConfirm) {
      this.setState({errorMsg: 'Emails don\'t match'});
    } else if (this.state.name.length==0) {
      this.setState({errorMsg: 'Must input a name'});
    } else if (this.state.email.length==0) {
      this.setState({errorMsg: 'Must input an email'});
    } else {
      this.setState({errorMsg: '', status: 'submitting'});
      let data = {name: this.state.name, email: this.state.email, statement: this.state.statement};
      $.post({
        url: '/do_urop_submit',
        data: JSON.stringify(data),
        dataType: 'json',
        success: result => {
          this.setState({status: 'submitted'});
        }
      });
    }
  },

  updateName: function(event) {
    this.setState({name: event.target.value});
  },

  updateEmail: function(event) {
    this.setState({email: event.target.value});
  },

  updateEmailConfirm: function(event) {
    this.setState({emailConfirm: event.target.value});
  },

  updateStatement: function(event) {
    this.setState({statement: event.target.value});
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
      <div id="form">
        {error_msg}
        <div className='page-header'>
          <h1>Apply for a UROP</h1>
        </div>

        <p>Please fill out this form:</p>
        <form className='form-horizontal' id='urop-form' onSubmit={this.onSubmit}>
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
            <label className='col-sm-2'>Confirm email</label>
            <div className='col-sm-9'>
              <input type='email' className='form-control'  name="email_confirm" value={this.state.emailConfirm} onChange={this.updateEmailConfirm}/>
            </div>
          </div>

          <div className='form-group'>
            <label className='col-sm-2'>Statement of interest</label>
            <div className='col-sm-9'>
              <textarea className='form-control' rows="10" name="statement" value={this.state.statement} onChange={this.updateStatement}/>
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
