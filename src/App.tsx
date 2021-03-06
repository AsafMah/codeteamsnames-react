import React, {
    FunctionComponent,
    Ref,
    SyntheticEvent,
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import {Chance} from 'chance';
import {useScreenshot} from './use-react-screenshot'
import ColorHash from 'color-hash-ts';

interface User {
    groupId: string;
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
    const [filter, setFilter] = useState("");
    const [groups, setGroups] = useState<Map<string, string>>(new Map());
    const ref = useRef(null);
    const [image, takeScreenshot] = useScreenshot()
    const [nameLists] = useState(() => {
        const prev = window.localStorage.getItem("nameLists");
        if (prev) {
            return JSON.parse(prev);
        } else {
            return defaultNameLists;
        }
    });


    const colors = ["red", "blue", "green", "yellow", "indigo", "purple", "pink"];

    const onScreenshot = async (_: unknown) => {
        const {blob} = await takeScreenshot(ref.current);
        // @ts-ignore
        if (!navigator.clipboard.write) {
            return;
        }

        // @ts-ignore
        await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
        setTime(new Date().toLocaleTimeString());
    };

    function getMatched(user: User) {
        try {
            const regExp = new RegExp(`(?<before>.*)(?<matched>${filter})(?<after>.*)`, "i");
            return filter ?
                user.name.match(regExp)?.groups ?? null :
                user.name;
        } catch (e) {
            return user.name;
        }
    }

    let members = [...users.values()].map(user => (
        <Member key={user.name} {...user} groupName={groups.get(user.groupId) ?? ""}
                onChange={u => {
                    const newMap = new Map(users);
                    newMap.set(user.name, u);
                    setUsers(newMap);
                }} matched={getMatched(user)}
                onGroupClicked={g => setAll(members.filter(x => x.props.matched && x.props.displayed && x.props.groupId === g && !x.props.enabled).length > 0, x => x.props.matched && x.props.displayed && x.props.groupId === g)}/>
    ));


    function setAll(value: boolean, predicate: (m: JSX.Element) => boolean = m => m.props.matched && m.props.displayed) {
        const newUsers = new Map(users);
        members.filter(predicate).forEach(m => newUsers.get(m.props.name)!.enabled = value);
        setUsers(newUsers);
    }

    return (
        <div className="flex">
            <div className="px-1 flex-auto">
                <NameArea names={nameLists} users={users} onChange={setUsers} groups={groups}
                          onGroupsChange={setGroups}
                          onSaveNames={
                              names => {
                                  window.localStorage.setItem("nameLists", JSON.stringify(names));
                              }
                          }/>
            </div>
            <div className="font-normal container mx-auto px-40 flex-auto">
                <div>Filter: <input className="border border-black" type="text" autoFocus={true}
                                    value={filter} onChange={e => setFilter(e.target.value)}/>
                    <button
                        className="text-l font-medium rounded-md p-2 mx-2 bg-blue-500 text-white"
                        onClick={_ => setAll(true)}>Select All
                    </button>

                    <button
                        className="text-l font-medium rounded-md p-2 mx-2 bg-blue-500 text-white"
                        onClick={_ => setAll(false)}>Select None
                    </button>
                </div>
                <div className="flex flex-wrap justify-center"> {members}
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

const Member: FunctionComponent<WithOnChange<User> & { groupName: string, matched: string | Record<string, string> | null, onGroupClicked: (group: string) => void }> =
    ({
         name,
         smPool,
         enabled,
         id,
         groupId,
         displayed,
         onChange,
         matched,
         onGroupClicked,
         groupName
     }) => {
    const setSmPool = (smPool: boolean) => onChange({
        name,
        enabled,
        smPool,
        id,
        groupId: groupId,
        displayed
    });
    const setEnabled = (enabled: boolean) => onChange({
        name,
        enabled,
        smPool,
        id,
        groupId: groupId,
        displayed
    });
    const overallColor = enabled ? "green" : "gray";
    const canBeSmColor = enabled && smPool ? "green" : "gray";
    const smHover = enabled ? `bg-${canBeSmColor}-300 hover:bg-${canBeSmColor}-400` : "";
    const groupColor = new ColorHash().hex(groupId);

    let getFormattedName = useCallback(() => {
        if (matched == null) {
            return null
        }
        if (typeof matched == "string") {
            return <>{matched}</>;
        }
        return <> {matched["before"]}<span
            className="font-bold text-yellow-500">{matched["matched"]}</span>{matched["after"]} </>;
    }, [matched]);
    const formattedName = getFormattedName();

    let onSmClick = (e: SyntheticEvent) => {
        e.stopPropagation();
        if (!enabled) {
            setEnabled(true);
            return;
        }
        setSmPool(!smPool)
    };
    return (
        formattedName && displayed ? <div
            className={`relative text-xl p-3 pr-5 m-3 bg-${overallColor}-300 hover:bg-${overallColor}-400 rounded-md items-center cursor-pointer`}
            onClick={() => setEnabled(!enabled)}>
            <button
                className="font-medium rounded-md p-2 bg-blue-500 text-white">{formattedName}</button>
            <button className="absolute right-0 top-0 text-xs rounded p-1 text-white"
                    style={{"backgroundColor": groupColor}}
                    onClick={e => {
                        e.stopPropagation();
                        onGroupClicked(groupId)
                    }}
            >{groupName}</button>
            <div className={`block border-4 ${smHover} cursor-pointer`}
                 onClick={onSmClick}>
                <input type="checkbox" className="cursor-pointer" name="SM Pool" id={name}
                       checked={smPool}
                       onChange={onSmClick}/>
                <label className="cursor-pointer" htmlFor="SM Pool"> Can Be SM</label></div>
        </div> : null
    );
};

function NamesBox(props: {
    group: string,
    enabled: boolean,
    onCheckedChange: (value: boolean) => void, users: string,
    onNameChange: (name: string) => void,
    onTextChange: (users: string[]) => void,
    onDelete: () => void,
}) {
    return <div className="border">
        Group <input className="border border-black" type="text" value={props.group}
                     onChange={e => props.onNameChange(e.target.value)}/>

        <div>
            <input type="checkbox" checked={props.enabled}
                   onChange={e => props.onCheckedChange(e.target.checked)}/>
            <span> Enable this list </span>
            <button
                className="inline text-sm rounded-md m-1 p-1 bg-red-600 hover:bg-red-800 text-white"
                onClick={_ => { props.onDelete() }}>Delete
            </button>
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

const NameArea: FunctionComponent<{
    names: Record<string, string[]>,
    users: Map<string, User>,
    groups: Map<string, string>,
    onChange: (users: Map<string, User>) => void,
    onGroupsChange: (groups: Map<string, string>) => void,
    onSaveNames: (names: Record<string, string[]>) => void
}> =
    ({names, groups, users, onChange, onSaveNames, onGroupsChange}) => {

        const [enabledStates, setEnabledStates] = useState<Record<string, boolean>>({});
        const [saveTime, setSaveTime] = useState<string | null>(null);
        const [newGroupName, setNewGroupName] = useState("");
        const updateUsersGet = useCallback((newUsersArray: string[], groupId: string, users: Map<string, User>, enabledStates: Record<string, boolean>) => {
            const newUsers: Map<string, User> = new Map();

            for (const u of namesToUsers(newUsersArray)) {
                let name = u.name ?? "";
                newUsers.set(name, users.get(name) ?? {
                    name: name,
                    smPool: u.smPool ?? false,
                    enabled: u.enabled ?? false,
                    id: Chance().guid(),
                    groupId: groupId,
                    displayed: enabledStates[groupId] ?? false
                });
                let insertedUser = newUsers.get(name)!;
                insertedUser.displayed = enabledStates[groupId] ?? false;
                insertedUser.smPool = u.smPool ?? false;
            }

            for (const [name, user] of users) {
                if (user.groupId !== groupId) {
                    newUsers.set(name, user);
                }
            }
            return newUsers;
        }, []);

        useEffect(() => {
            let users = new Map();
            const newGroups = new Map();
            const values = [...newGroups.entries()];
            const enabledStates : Record<string, boolean> = {};
            Object.keys(names).forEach(groupName =>{
                const result = values.find(([_, name]) => name === groupName);
                let id = "";
                const namesInGroup = names[groupName];
                if (!result)
                {
                    id = groupName+Chance().guid();
                    if (groupName.endsWith("+"))
                    {
                        groupName = groupName.slice(0, groupName.length - 1);
                        enabledStates[id] = true;
                    }
                    newGroups.set(id, groupName)
                }
                else {
                    id = result[0];
                }
                users = updateUsersGet(namesInGroup, id, users, enabledStates);
            });
            onChange(users);
            onGroupsChange(newGroups);
            setEnabledStates(enabledStates);
        }, [names, onChange, onGroupsChange, updateUsersGet]);

        const updateUsersInGroup = (newUsersArray: string[], group: string) => {
            const newUsers = updateUsersGet(newUsersArray, group, users, enabledStates);
            onChange(newUsers);
        }

        const namesToUsers = (names: string[]): Partial<User>[] => {
            return names.map(u => {
                let trimmed = u.trimStart();
                let canBeSm = true;
                let enabled = false;

                if (u.endsWith("+")) {
                    enabled = true;
                    trimmed = u.slice(0, u.length - 1);
                }

                if (u.endsWith("-")) {
                    canBeSm = false;
                    trimmed = u.slice(0, u.length - 1);
                }

                return {
                    name: trimmed,
                    smPool: canBeSm,
                    enabled: enabled
                }
            });
        };

        const getArrangedUsers = useCallback(() => {
            const arr: Record<string, string[]> = {};
            for (const u of users.values()) {
                if (!arr[u.groupId]) {
                    arr[u.groupId] = [];
                }
                let name = u.name + (u.smPool ? "" : "-") + (u.enabled ? "+" : "");
                arr[u.groupId].push(name);
            }
            const arrangedUsers: Record<string, string> = {};

            Object.keys(arr).forEach((k) => arrangedUsers[k] = arr[k].join("\n"));

            for (const group of groups.keys()) {
                if (!arrangedUsers[group])
                {
                    arrangedUsers[group] = "";
                }
            }

            return arrangedUsers;
        }, [users, groups]);
        const arrangedUsers = getArrangedUsers();


        return <>
            <div>
                <button
                    className="text-l font-medium rounded-md p-2 mx-2 bg-blue-500 text-white"
                    onClick={_ => {
                        onSaveNames(
                            Object.fromEntries(
                                Object.entries(arrangedUsers).map(([k, v]) => [(groups.get(k) ?? "") + (enabledStates[k] ? "+" : ""), v.split("\n")])));
                        setSaveTime("Saved at " + new Date().toLocaleTimeString());
                    }}>Save
                </button>
                {saveTime}
            </div>
            {Object.keys(arrangedUsers).sort().map((key) =>
                <NamesBox key={key}
                          group={groups.get(key)!}
                          enabled={enabledStates[key] ?? false}
                          onNameChange={newName => {
                              const newGroups = new Map(groups);
                              newGroups.set(key, newName);
                              onGroupsChange(newGroups);
                          }}
                          onCheckedChange={checked => {
                              const esCopy = {...enabledStates};
                              esCopy[key] = checked;
                              setEnabledStates(esCopy);
                              onChange(updateUsersGet(arrangedUsers[key].split("\n"), key, users, esCopy));
                          }}
                          users={arrangedUsers[key]}
                          onTextChange={value => updateUsersInGroup(value, key)}
                          onDelete={() => {
                              const newUsers = new Map();
                              for (const [id, user] of users.entries()) {
                                  if (user.groupId !== key){
                                      newUsers.set(id, user)
                                  }
                              }
                              onChange(newUsers);
                              const newGroups = new Map(groups);
                              newGroups.delete(key);
                              onGroupsChange(newGroups);
                          }}
                />
            )}
            <div>
                <div>
                    New group:
                    <input className="border border-black" type="text"
                           value={newGroupName}
                           onChange={e => setNewGroupName(e.target.value)}/>
                    <button
                        className="inline text-sm rounded-md m-1 p-1 bg-green-600 hover:bg-green-800 text-white"
                        onClick={_ => {
                            const newGroups = new Map(groups);
                            const id = newGroupName + Chance().guid();
                            newGroups.set(id, newGroupName);
                            enabledStates[id] = true;
                            onGroupsChange(newGroups);
                        }}>Add
                    </button>
                </div>
            </div>
            </>;
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
    const [freeze, setFreeze] = useState(false);
    useEffect(() => {
        setSeed(Chance().integer())
    }, [users]);
    useEffect(() => {
        if (freeze) {
            setRandom(old => Chance(old.seed));
        }
        else {
            setRandom(Chance(seed));
        }

    }, [seed, freeze]);

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

    return <div>
    <table ref={imageRef} className="table-fixed p-3 text-2xl text-center flex-auto">
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
        <div>
            <input type="checkbox" checked={freeze} onChange={e => setFreeze(e.target.checked)}/> Freeze
        </div>
    </div>
};


export default App;


const defaultNameLists: Record<string, string[]> = {
    "common+": [
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
    ], "additional": ["Yahav", "AmitOf", "Ron"]
};