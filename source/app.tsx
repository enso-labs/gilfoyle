import {Text} from 'ink';

type Props = {
	name: string | undefined;
};

export default function App({name = 'Stranger'}: Props) {
	console.debug('App');
	return (
		<Text>
			Hello, <Text color="green">{name}</Text>
		</Text>
	);
}
