import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../stores/chat.store';
import commandsJson from '../commands.json';
import { CommandSuggestion, MatchedCommand } from '../interfaces';
import { setMessage } from '../reducers/chat.reducer';
import classnames from 'classnames';

export function Commands({ focus = false }) {
    // --------------------------------------------------------------
    // Chat Store
    // --------------------------------------------------------------

    const message = useSelector((state: RootState) => state.chat.message);
    const dispatch = useDispatch();

    // --------------------------------------------------------------
    // States
    // --------------------------------------------------------------

    const [commands, setCommands] = useState<Array<CommandSuggestion>>(commandsJson);
    const [matchedCommands, setMatchedCommands] = useState<Array<MatchedCommand>>([]);
    const [selected, setSelected] = useState(-1);
    const [max, setMax] = useState(3);
    const [prefix, setPrefix] = useState('/');
    const [key, setKey] = useState('');

    // --------------------------------------------------------------
    // Functions
    // --------------------------------------------------------------

    function addPrefix(message: string): string {
        return prefix + message;
    }

    function removePrefix(message: string): string {
        return message.startsWith(prefix) ? message.substring(1) : message;
    }

    function selectCommand(event: KeyboardEvent) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Tab') return;
        event.preventDefault();
        setKey(event.key);
    }

    function updateMatchedCommands(message: string) {
        if (!message) {
            setMatchedCommands([]);
            return;
        }

        const words = message.split(' ');
        if (!words[0].startsWith(prefix)) {
            setMatchedCommands([]);
            return;
        }

        const newMatchedCommands = commands
            .filter((command) => {
                const cmdName = removePrefix(words[0]);

                return (
                    cmdName.length > 0 &&
                    command.name.startsWith(cmdName) &&
                    words.length - 1 <= (command.params?.length ?? 0)
                );
            }) // Filter commands that match the message
            .splice(0, max) // Only show the first 3 commands
            .map((command) => {
                let currentParam = -1; // The current parameter we are looking at
                const cmdName = addPrefix(command.name); // The command name with the prefix
                // If there is only one word, it's the command name
                if (words.length === 1 && words[0] === cmdName) currentParam = 0;

                // If there are more words, check if they are parameters
                if (words.length > 1 && words.length - 1 <= (command?.params?.length ?? 0))
                    currentParam = words.length - 1; // The last word is the current parameter

                return { currentParam, ...command };
            }); // Map the commands to include the current parameter
        setMatchedCommands(newMatchedCommands);
        newMatchedCommands.length === 0 ? setSelected(-1) : setSelected(0); // Reset selected if no commands are found
    }

    function addSuggestion(suggestion: CommandSuggestion | Array<CommandSuggestion>) {
        Array.isArray(suggestion)
            ? setCommands((commands) => [...commands, ...suggestion])
            : setCommands((commands) => [...commands, suggestion]);
    }

    // --------------------------------------------------------------
    // Hooks
    // --------------------------------------------------------------

    useEffect(() => {
        window.addEventListener('keydown', selectCommand);
        window?.alt?.on('vchat:addSuggestion', addSuggestion);

        return () => {
            window.removeEventListener('keydown', selectCommand);
            window?.alt?.off('vchat:addSuggestion', addSuggestion);
        };
    }, []);

    useEffect(() => updateMatchedCommands(message), [message, commands]);

    useEffect(() => {
        if (!key) return;
        // Select previous command
        if (key === 'ArrowUp' && matchedCommands.length > 1) setSelected(Math.max(0, selected - 1));
        // Select next command
        else if (key === 'ArrowDown' && matchedCommands.length > 1)
            setSelected(Math.min(matchedCommands.length - 1, selected + 1));
        // Select the selected command to the chat box input
        else if (key === 'Tab' && selected >= 0 && !(matchedCommands[selected].currentParam > -1))
            dispatch(setMessage(addPrefix(matchedCommands[selected].name)));
        setKey('');
    }, [key]);

    return (
        <div
            className={classnames('mt-[4px] text-white flex flex-col transition origin-top', {
                'scale-y-0': !focus || matchedCommands.length === 0,
                'scale-y-100': matchedCommands.length > 0 && focus,
            })}
        >
            {matchedCommands.map((matchedCommand, cmdIndex) => (
                <div
                    key={cmdIndex}
                    className={classnames('bg-black px-[16px] py-[8px] transition duration-200 select-none', {
                        'bg-opacity-50': cmdIndex === selected,
                        'bg-opacity-30': cmdIndex !== selected,
                        'hover:bg-opacity-50': cmdIndex !== selected,
                    })}
                >
                    <div className="flex text-base text-white text-opacity-100">
                        <span>{prefix}</span>
                        <span className={classnames({ 'font-bold': matchedCommand.currentParam === 0 })}>
                            {matchedCommand.name}
                        </span>
                        {(matchedCommand.params ?? []).map((param, paramIndex) => (
                            <span
                                key={paramIndex}
                                className={classnames('ml-1', {
                                    'font-bold': matchedCommand.currentParam === paramIndex + 1,
                                })}
                            >
                                [{param.name}]
                            </span>
                        ))}
                    </div>
                    <div className="text-xs text-white text-opacity-50">
                        {(matchedCommand.currentParam <= 0
                            ? matchedCommand.description
                            : matchedCommand.params![matchedCommand.currentParam - 1].description) ?? ''}
                    </div>
                </div>
            ))}
        </div>
    );
}
