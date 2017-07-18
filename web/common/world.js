class Hello {
	
	constructor( options ) {
		this.options = options;
	}

	ping() {
		console.log( this.options);
	}
}


class World extends Hello {
	constructor( name, options ) {
		super(options);
		this.name = name;
	}

	pong() {
		console.log( this.name, this.options );
	}

}


module.exports = World;