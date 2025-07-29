import {useCallback} from 'react';
import {AppStateState} from './state.js';

export const useAppStateEffects = (
	setState: React.Dispatch<React.SetStateAction<AppStateState>>,
) => {
	const setStatus = useCallback(
		(status: string) => {
			setState(prev => ({
				...prev,
				status,
			}));
		},
		[setState],
	);

	const setInitProgress = useCallback(
		(progress?: string) => {
			setState(prev => ({
				...prev,
				initProgress: progress,
			}));
		},
		[setState],
	);

	const updateStatusFromResult = useCallback(
		(result: {success: boolean; message?: string}) => {
			if (result.message) {
				setStatus(result.message);
			}
		},
		[setStatus],
	);

	return {
		setStatus,
		setInitProgress,
		updateStatusFromResult,
	};
};
