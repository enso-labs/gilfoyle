import InteractiveApp from './components/InteractiveApp.js';

type Props = {
	name: string | undefined;
};

export default function App({name}: Props) {
	return <InteractiveApp name={name} version="0.3.43" />;
}
