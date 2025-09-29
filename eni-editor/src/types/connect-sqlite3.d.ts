declare module 'connect-sqlite3' {
	import type session from 'express-session';
	class SQLiteStore extends (session as any).Store {
		constructor(options?: any);
	}
	function factory(sess: typeof session): typeof SQLiteStore;
	export default factory;
}
