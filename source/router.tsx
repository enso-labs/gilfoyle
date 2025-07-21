import AppProvider from './providers/AppProvider/index.js';

function Router({children}: {children: React.ReactNode}) {
	return <AppProvider>{children}</AppProvider>;
}

export default Router;
