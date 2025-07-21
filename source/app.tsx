import InteractiveApp from './components/InteractiveApp.js';
import dotenv from 'dotenv';

dotenv.config();

type Props = {
	name: string | undefined;
};

export default function App({name}: Props) {
	return <InteractiveApp name={name} version="0.3.43" />;
}
