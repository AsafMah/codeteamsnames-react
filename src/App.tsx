import React, {
    FunctionComponent, Ref,
    SyntheticEvent, useCallback,
    useEffect, useRef,
    useState
} from 'react';

import {Chance} from 'chance';
import {useScreenshot} from './use-react-screenshot'


interface User {
    groupName: string;
    name: string;
    smPool: boolean;
    enabled: boolean;
    displayed: boolean;
    id: string;
    isSm?: boolean;
}

type OnChange<T> = { onChange: (item: T) => void };
type WithOnChange<T> = T & OnChange<T>;


const App: FunctionComponent = () => {
    const [users, setUsers] = useState<Map<string, User>>(new Map());
    const [teamCount, setTeamCount] = useState(2);
    const [bias, setBias] = useState("red");
    const [time, setTime] = useState("");
    const ref = useRef(null);
    const [image, takeScreenshot] = useScreenshot()
    const colors = ["red", "blue", "green", "yellow"];

    const onScreenshot = async (_: unknown) => {
        const {blob} = await takeScreenshot(ref.current);
        // @ts-ignore
        if (!navigator.clipboard.write) {
            return;
        }

        // @ts-ignore
        await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
        setTime(new Date().toDateString());
    };

    return (
        <div className="flex">
            <div className="px-1 flex-auto">
                <NameArea names={nameLists} users={users} onChange={setUsers}/>
            </div>
            <div className="font-normal container mx-auto px-40 flex-auto">
                <div className="flex flex-wrap justify-center"> {[...users.values()].map(user => (
                    <Member key={user.name} {...user} onChange={u => {
                        const newMap = new Map(users);
                        newMap.set(user.name, u);
                        setUsers(newMap);
                    }}/>
                ))
                }
                </div>
                <div className="mx-auto flex flex-wrap">
                    <div>
                        <div className="inline-block text-xl"><label htmlFor="teamCount">Team
                            Count: </label>
                            <input className="border border-black" name="teamCount" type="number"
                                   min={2} max={colors.length} value={teamCount} onChange={e => {
                                let number = +e.target.value;
                                if (number < 2) {
                                    number = 2;
                                }
                                if (number > colors.length) {
                                    number = colors.length;
                                }

                                setTeamCount(number);
                            }}/></div>
                        <div
                            className="flex"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBias(e.target.value)}>
                            {[...colors.slice(0, teamCount), "random"].map(c => <div
                                className="capitalize inline-block px-3" key={c}><input
                                type="radio" value={c} defaultChecked={c === bias}
                                name="bias"/> {c} </div>)}
                        </div>
                        <button
                            className="text-2xl font-medium rounded-md p-2 m-4 bg-blue-500 text-white"
                            onClick={_ => setUsers(new Map(users))}>Reshuffle Teams
                        </button>
                        <Teams imageRef={ref} users={[...users.values()]} teamCount={teamCount}
                               colors={colors}
                               bias={bias}/>
                    </div>
                </div>
            </div>
            <div className="p-4 flex-auto">
                <button className=" font-medium rounded-md p-2 bg-blue-500 text-white"
                        onClick={onScreenshot}>Screenshot
                </button>
                {time ? <div><img src={image?.base64} alt="screenshot"/> Screenshot taken at {time}
                </div> : ""}
            </div>
        </div>
    );
};

const Member: FunctionComponent<WithOnChange<User>> = ({
                                                           name,
                                                           smPool,
                                                           enabled,
                                                           id,
                                                           groupName,
                                                           displayed,
                                                           onChange
                                                       }) => {
    const setSmPool = (smPool: boolean) => onChange({
        name,
        enabled,
        smPool,
        id,
        groupName: groupName,
        displayed
    });
    const setEnabled = (enabled: boolean) => onChange({
        name,
        enabled,
        smPool,
        id,
        groupName: groupName,
        displayed
    });
    const overallColor = enabled ? "green" : "gray";
    const canBeSmColor = enabled && smPool ? "green" : "gray";
    const smHover = enabled ? `bg-${canBeSmColor}-300 hover:bg-${canBeSmColor}-400` : "";

    let onSmClick = (e: SyntheticEvent) => {
        e.stopPropagation();
        if (!enabled) {
            setEnabled(true);
            return;
        }
        setSmPool(!smPool)
    };
    return (
        name && displayed ? <div
            className={`text-xl p-3 m-3 bg-${overallColor}-300 hover:bg-${overallColor}-400 rounded-md items-center cursor-pointer`}
            onClick={() => setEnabled(!enabled)}>
            <button
                className=" font-medium rounded-md p-2 bg-blue-500 text-white">{name}</button>
            <div className={`block border-4 ${smHover} cursor-pointer`}
                 onClick={onSmClick}>
                <input type="checkbox" className="cursor-pointer" name="SM Pool" id={name}
                       checked={smPool}
                       onChange={onSmClick}/>
                <label className="cursor-pointer" htmlFor="SM Pool"> Can Be SM</label></div>
        </div> : null
    );
};

function NamesBox(props: { group: string, enabled: boolean, onCheckedChange: (value: boolean) => void, users: string, onTextChange: (users: string[]) => void }) {
    return <div className="border">
        Group {props.group}
        <div>
            <input type="checkbox" checked={props.enabled}
                   onChange={e => props.onCheckedChange(e.target.checked)}/>
            <span> Enable this list </span>
        </div>

        <textarea key={props.group}
            className="border-2 border-gray-500"
            name="names"
            id="names"
            disabled={!props.enabled}
            cols={30}
            rows={props.users.split("\n").length + 2}
            onChange={e => props.onTextChange(e.target.value.split("\n"))}
            value={props.users}
        />
    </div>;
}

const NameArea: FunctionComponent<{ names: Record<string, string[]>, users: Map<string, User>, onChange: (users: Map<string, User>) => void }> =
    ({names, users, onChange}) => {

        const [enabledStates, setEnabledStates] = useState<Record<string,boolean>>( Object.fromEntries(Object.keys(names).map((k) => [k, k === "common"])));

        const updateUsersGet = useCallback((newUsersArray: string[], groupName: string, users: Map<string, User>, enabledStates: Record<string,boolean>) => {
            const newUsers: Map<string, User> = new Map();

            for (const u of namesToUsers(newUsersArray)) {
                let name = u.name ?? "";
                newUsers.set(name, users.get(name) ?? {
                    name: name,
                    smPool: u.smPool ?? false,
                    enabled: false,
                    id: Chance().guid(),
                    groupName: groupName,
                    displayed: enabledStates[groupName]  ?? false
                });
                let insertedUser = newUsers.get(name)!;
                insertedUser.displayed = enabledStates[groupName] ?? false;
                insertedUser.smPool = u.smPool ?? false;
            }


            for (const [name, user] of users) {
                if (user.groupName !== groupName) {
                    newUsers.set(name, user);
                }
            }
            return newUsers;
        }, []);

        useEffect(() => {
            let users = new Map();
            Object.keys(names).map(group => users = updateUsersGet(names[group], group, users, {"common": true}));
            onChange(users);

        }, [names, onChange, updateUsersGet]);

        const updateUsersInGroup = (newUsersArray: string[], group: string) => {
            const newUsers = updateUsersGet(newUsersArray, group, users, enabledStates);
            onChange(newUsers);
        }

        const namesToUsers = (names: string[]): Partial<User>[] => {
            return names.map(u => {
                let trimmed = u.trimStart();
                let canBeSm = true;
                if (u.endsWith("-")) {
                    canBeSm = false;
                    trimmed = u.slice(0, u.length - 1);
                }

                return {
                    name: trimmed,
                    smPool: canBeSm
                }
            });
        };

        const arr: Record<string, string[]> = {};
        for (const u of users.values()) {
            if (!arr[u.groupName]) {
                arr[u.groupName] = [];
            }

            let name = u.name + (u.smPool ? "" : "-");

            arr[u.groupName].push(name);
        }
        const arrangedUsers: Record<string, string> = {};

        Object.keys(arr).forEach((k, i) => arrangedUsers[k] = arr[k].join("\n"));

        return <>
            {Object.keys(arrangedUsers).sort().map((key, index) =>
            <NamesBox key={index + key}
                      group={key}
                      enabled={enabledStates[key]}
                      onCheckedChange={checked => {
                          const esCopy = {...enabledStates};
                          esCopy[key] = checked;
                          setEnabledStates(esCopy);
                          onChange(updateUsersGet(arrangedUsers[key].split("\n"), key, users, esCopy));
                      }}
                      users={arrangedUsers[key]}
                      onTextChange={value => updateUsersInGroup(value, key)} />
        )} </>;
    }

const Teams: FunctionComponent<{ imageRef: Ref<any>, users: User[], teamCount: number, colors: string[], bias: string }> = ({
                                                                                                                                users,
                                                                                                                                teamCount,
                                                                                                                                colors,
                                                                                                                                bias,
                                                                                                                                imageRef
                                                                                                                            }) => {
    const [seed, setSeed] = useState(0);
    const [random, setRandom] = useState(Chance());
    const [sortedUsers, setSortedUsers] = useState<User[][]>([]);
    useEffect(() => setSeed(Chance().integer()), [users]);
    useEffect(() => setRandom(Chance(seed)), [seed]);

    useEffect(() => {
        const shuffledUsers = random.shuffle(users.filter(u => u.enabled && u.displayed));
        if (!shuffledUsers) {
            return;
        }
        const smToFront = shuffledUsers.sort((a, b) => a.smPool ? -1 : (b.smPool ? 1 : 0));
        const finalArr: User[][] = [];

        for (let i = 0; i < smToFront.length / teamCount; i++) {
            finalArr.push([]);
            for (let j = 0; j < teamCount; j++) {
                let user = smToFront[i * teamCount + j] ?? {
                    name: "",
                    enabled: false,
                    smPool: false,
                    id: Chance().guid()
                };
                finalArr[i].push(user);
                finalArr[i][j].isSm = i === 0 && user.smPool;
            }
        }
        let biasIndex = colors.slice(0, teamCount).findIndex(x => x === bias);
        if (biasIndex === -1) {
            biasIndex = Chance().integer({min: 0, max: teamCount - 1});
        }
        let finalRow = finalArr.length - 1;
        if (finalArr[finalRow]) {
            if (!finalArr[finalRow][biasIndex].enabled) {
                let firstNamedIndex = finalArr[finalRow].findIndex(n => n.enabled);
                if (firstNamedIndex !== -1) {
                    const temp = finalArr[finalRow][biasIndex];
                    finalArr[finalRow][biasIndex] = finalArr[finalRow][firstNamedIndex]
                    finalArr[finalRow][firstNamedIndex] = temp;
                }
            }
        }

        setSortedUsers(finalArr);
    }, [random, teamCount, bias, colors, users]);

    return <table ref={imageRef} className="table-fixed p-3 text-2xl text-center flex-auto">
        <thead>
        <tr>
            {colors.slice(0, teamCount).map(c =>
                <th key={c} className={`p-2 capitalize bg-${c}-400`}>{c + " Team"}</th>
            )
            }
        </tr>
        </thead>
        <tbody>
        {sortedUsers.map((row) => <tr key={row.map(c => c.id).join()}>
            {row.map((u, i) =>
                <td className={`p-3 border bg-${colors[i]}-200 ${u.isSm ? "font-bold" : ""}`}
                    key={u.id}>
                    {u.name + (u.isSm ? " - Spy Master" : "")}
                </td>
            )}
        </tr>)}
        </tbody>
    </table>
};


export default App;


const nameLists : Record<string, string[]> = {"common": [
    "AmitSh",
    "Ariel",
    "Asaf",
    "Boaz",
    "Keren",
    "Lea",
    "Nir",
    "Ohad",
    "Ran",
    "Vladik",
    "Yihezkel-",
    "Yochai",
], "additional": ["Yahav", "AmitOf", "Ron"]};