import InteractiveApp from './components/InteractiveApp.js';
import dotenv from 'dotenv';
import Router from './router.js';

dotenv.config();

type Props = {
	name: string | undefined;
};

export default function App({name}: Props) {
	return (
		<Router>
			<InteractiveApp name={name} version="0.3.43" />
		</Router>
	)
}
