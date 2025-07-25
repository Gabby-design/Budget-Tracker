import * as React from 'react';
import { useState, useEffect } from 'react';
import { SafeAreaView, FlatList, View, Dimensions, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Provider as PaperProvider, Appbar, TextInput, Button, Card, Title, Paragraph, FAB, Menu, Modal, Portal, ProgressBar } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const defaultCategories = [
  'Food & Dining',
  'Transportation',
  'Salary',
  'Entertainment',
  'Freelance',
  'Other'
];

const MAX_LABEL_LENGTH = 10; // Maximum length for category labels

const currencies = [
  { label: 'USD ($)', symbol: '$' },
  { label: 'EUR (€)', symbol: '€' },
  { label: 'GBP (£)', symbol: '£' },
  { label: 'KES (KSh)', symbol: 'KSh' },
  { label: 'NGN (₦)', symbol: '₦' },
  { label: 'INR (₹)', symbol: '₹' },
  { label: 'JPY (¥)', symbol: '¥' }, // Example
];

const getCurrencyIcon = (symbol) => {
  switch (symbol) {
    case '$': return 'currency-usd';
    case '€': return 'currency-eur';
    case '£': return 'currency-gbp';
    case 'KSh': return 'currency-kes';
    case '₦': return 'currency-ngn';
    case '₹': return 'currency-inr';
    case '¥': return 'currency-jpy';
    default: return 'currency-usd';
  }
};

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [category, setCategory] = useState(defaultCategories[0]);
  const [showForm, setShowForm] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currency, setCurrency] = useState('$');
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [addCategoryMenuVisible, setAddCategoryMenuVisible] = useState(false);
  const [editCategoryMenuVisible, setEditCategoryMenuVisible] = useState(false);
  const [addCurrencyMenuVisible, setAddCurrencyMenuVisible] = useState(false);
  const [editCurrencyMenuVisible, setEditCurrencyMenuVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState(defaultCategories[0]);
  const [editRawAmount, setEditRawAmount] = useState('');
  const [mustSelectCurrency, setMustSelectCurrency] = useState(false);
  const [userBudget, setUserBudget] = useState('');
  const [rawBudget, setRawBudget] = useState('');
  const [mustSetBudget, setMustSetBudget] = useState(false);

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check for credentials
        const savedCreds = await AsyncStorage.getItem('credentials');
        if (!savedCreds) {
          setAuthMode('signup');
        }
        const savedCurrency = await AsyncStorage.getItem('currency');
        if (savedCurrency) {
          setCurrency(savedCurrency);
          setMustSelectCurrency(false);
        } else {
          setMustSelectCurrency(true);
        }
        const jsonValue = await AsyncStorage.getItem('transactions');
        if (jsonValue != null) setTransactions(JSON.parse(jsonValue));
        // Load user budget
        const savedBudget = await AsyncStorage.getItem('userBudget');
        if (savedBudget) {
          setRawBudget(savedBudget);
          setUserBudget(formatCurrency(savedBudget, savedCurrency || currency));
          setMustSetBudget(false);
        } else {
          setMustSetBudget(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  React.useEffect(() => {
    AsyncStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  React.useEffect(() => {
    AsyncStorage.setItem('currency', currency);
  }, [currency]);

  const addTransaction = () => {
    if (!desc || !rawAmount || !category) return;
    setTransactions([
      ...transactions,
      { id: Date.now().toString(), desc, amount: parseFloat(rawAmount), category }
    ]);
    setDesc('');
    setAmount('');
    setRawAmount('');
    setCategory(defaultCategories[0]);
    setShowForm(false);
  };

  // Separate transactions by type
  const incomeTransactions = transactions.filter(tx => tx.amount > 0);
  const expenseTransactions = transactions.filter(tx => tx.amount < 0);

  // Prepare data for income and expense charts
  const getCategoryTotals = txs => {
    const totals = {};
    txs.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + Math.abs(tx.amount);
    });
    return Object.keys(totals).map((cat, i) => {
      const isLong = cat.length > MAX_LABEL_LENGTH;
      return {
        name: cat.length > MAX_LABEL_LENGTH ? cat.slice(0, MAX_LABEL_LENGTH) + '…' : cat,
        amount: totals[cat],
        color: ['#43e97b', '#4f8cff', '#f9d423', '#fc466b', '#f7971e', '#a259c6'][i % 6],
        legendFontColor: '#333',
        legendFontSize: isLong ? 10 : 14
      };
    });
  };

  const incomeChartData = getCategoryTotals(incomeTransactions);
  const expenseChartData = getCategoryTotals(expenseTransactions);

  // Open details modal
  const openDetails = (tx) => {
    setSelectedTransaction(tx);
    setEditMode(false);
    setEditDesc(tx.desc);
    setEditRawAmount(tx.amount.toString());
    setEditAmount(formatCurrency(tx.amount.toString(), currency));
    setEditCategory(tx.category);
  };

  // Save edited transaction
  const saveEdit = () => {
    setTransactions(transactions.map(tx =>
      tx.id === selectedTransaction.id
        ? { ...tx, desc: editDesc, amount: parseFloat(editRawAmount), category: editCategory }
        : tx
    ));
    setSelectedTransaction(null);
    setEditMode(false);
  };

  // Delete transaction
  const deleteTransaction = () => {
    setTransactions(transactions.filter(tx => tx.id !== selectedTransaction.id));
    setSelectedTransaction(null);
    setEditMode(false);
  };

  // Format currency function (reuse from previous answer)
  function formatCurrency(value, currency) {
    // Remove non-numeric except dot
    let cleaned = value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts[1];
    // Format with commas
    const [intPart, decPart] = cleaned.split('.');
    let formatted = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    if (decPart !== undefined) formatted += '.' + decPart;
    return currency + formatted;
  }

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalExpense = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Add login/signup logic
  const handleSignup = async () => {
    if (!authUsername || !authPassword) {
      setAuthError('Please enter a username and password.');
      return;
    }
    // Save credentials (hash password for basic obfuscation)
    const hash = btoa(authPassword);
    await AsyncStorage.setItem('credentials', JSON.stringify({ username: authUsername, password: hash }));
    setIsAuthenticated(true);
    setAuthError('');
  };
  const handleLogin = async () => {
    const savedCreds = await AsyncStorage.getItem('credentials');
    if (!savedCreds) {
      setAuthError('No account found. Please sign up.');
      setAuthMode('signup');
      return;
    }
    const { username, password } = JSON.parse(savedCreds);
    if (authUsername === username && btoa(authPassword) === password) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid username or password.');
    }
  };
  const handleLogout = async () => {
    setIsAuthenticated(false);
    setAuthUsername('');
    setAuthPassword('');
    setAuthError('');
  };

  if (!isAuthenticated) {
    return (
      <PaperProvider>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' }}>
          <Card style={{ width: 320, padding: 20 }}>
            <Title style={{ textAlign: 'center', marginBottom: 12 }}>
              {authMode === 'signup' ? 'Sign Up' : 'Login'}
            </Title>
            <TextInput
              label="Username"
              value={authUsername}
              onChangeText={setAuthUsername}
              style={{ marginBottom: 12 }}
              autoCapitalize="none"
            />
            <TextInput
              label="Password"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
              style={{ marginBottom: 12 }}
            />
            {authError ? (
              <Paragraph style={{ color: '#ff5252', marginBottom: 8 }}>{authError}</Paragraph>
            ) : null}
            {authMode === 'signup' ? (
              <Button mode="contained" onPress={handleSignup} style={{ marginBottom: 8 }}>
                Sign Up
              </Button>
            ) : (
              <Button mode="contained" onPress={handleLogin} style={{ marginBottom: 8 }}>
                Login
              </Button>
            )}
            <Button
              onPress={() => {
                setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                setAuthError('');
              }}
              style={{ marginTop: 4 }}
            >
              {authMode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </Button>
          </Card>
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f5f6fa' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {rawBudget && totalExpense > 0 && (
            (() => {
              const percentUsed = (parseFloat(rawBudget) > 0) ? (totalExpense / parseFloat(rawBudget)) : 0;
              if (percentUsed >= 1) {
                return (
                  <View style={{ backgroundColor: '#ff5252', padding: 10 }}>
                    <Paragraph style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                      Alert: You have exceeded your total budget!
                    </Paragraph>
                  </View>
                );
              } else if (percentUsed >= 0.8) {
                return (
                  <View style={{ backgroundColor: '#f9d423', padding: 10 }}>
                    <Paragraph style={{ color: '#333', textAlign: 'center', fontWeight: 'bold' }}>
                      Warning: You have used {Math.round(percentUsed * 100)}% of your total budget.
                    </Paragraph>
                  </View>
                );
              }
              return null;
            })()
          )}
          <Appbar.Header>
            <Appbar.Content title={`Budget Tracker Pro (${currency})`} />
            <Menu
              visible={currencyMenuVisible}
              onDismiss={() => setCurrencyMenuVisible(false)}
              anchor={
                <Appbar.Action
                  icon={getCurrencyIcon(currency)}
                  color="black"
                  onPress={() => setCurrencyMenuVisible(true)}
                />
              }
            >
              {currencies.map(cur => (
                <Menu.Item
                  key={cur.symbol}
                  onPress={() => {
                    setCurrency(cur.symbol);
                    setCurrencyMenuVisible(false);
                  }}
                  title={cur.label}
                />
              ))}
            </Menu>
            <Appbar.Action
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="logout" size={size} color={color} />
              )}
              color="black"
              onPress={handleLogout}
            />
          </Appbar.Header>

          {incomeChartData.length > 0 && (
            <View>
              <Paragraph style={{ textAlign: 'center', marginTop: 8, fontWeight: 'bold' }}>
                Total Income: {currency}{totalIncome.toLocaleString()}
              </Paragraph>
              <Paragraph style={{ textAlign: 'center', marginBottom: 4, fontWeight: 'bold' }}>
                Income by Category
              </Paragraph>
              <PieChart
                data={incomeChartData.map(d => ({
                  name: d.name,
                  population: d.amount,
                  color: d.color,
                  legendFontColor: d.legendFontColor,
                  legendFontSize: d.legendFontSize
                }))}
                width={Dimensions.get('window').width}
                height={180}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(67, 233, 123, ${opacity})`
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="16"
                absolute
                style={{ marginVertical: 2 }}
              />
            </View>
          )}
          {expenseChartData.length > 0 && (
            <View>
              <Paragraph style={{ textAlign: 'center', marginTop: 8, fontWeight: 'bold' }}>
                Total Expenses: {currency}{totalExpense.toLocaleString()}
              </Paragraph>
              <Paragraph style={{ textAlign: 'center', marginBottom: 4, fontWeight: 'bold' }}>
                Expenses by Category
              </Paragraph>
              <PieChart
                data={expenseChartData.map(d => ({
                  name: d.name,
                  population: d.amount,
                  color: d.color,
                  legendFontColor: d.legendFontColor,
                  legendFontSize: d.legendFontSize
                }))}
                width={Dimensions.get('window').width}
                height={180}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(252, 70, 107, ${opacity})`
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="16"
                absolute
                style={{ marginVertical: 2 }}
              />
            </View>
          )}
          <FlatList
            data={transactions}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const percent = rawBudget
                ? ((Math.abs(item.amount) / parseFloat(rawBudget)) * 100).toFixed(1)
                : 0;
              return (
                <Card style={{ marginBottom: 12 }} onPress={() => openDetails(item)}>
                  <Card.Content>
                    <Title>{item.desc}</Title>
                    <Paragraph>
                      {currency}{item.amount.toLocaleString()} — <Paragraph style={{ color: '#4f8cff' }}>{item.category}</Paragraph>
                    </Paragraph>
                    <Paragraph style={{ color: '#888', fontSize: 12 }}>
                      {percent}% of your total income
                    </Paragraph>
                  </Card.Content>
                </Card>
              );
            }}
            ListEmptyComponent={
              <Paragraph style={{ textAlign: 'center', marginTop: 40, color: '#aaa' }}>
                No transactions yet.
              </Paragraph>
            }
          />
          {showForm && (
            <Card style={{ margin: 16, padding: 16 }}>
              <TextInput
                label="Description"
                value={desc}
                onChangeText={setDesc}
                style={{ marginBottom: 12 }}
              />
              <TextInput
                label="Amount"
                value={amount}
                onChangeText={val => {
                  const raw = val.replace(/[^0-9.]/g, '');
                  setRawAmount(raw);
                  setAmount(formatCurrency(raw, currency));
                }}
                keyboardType="numeric"
                style={{ marginBottom: 12 }}
              />
              <Menu
                visible={addCategoryMenuVisible}
                onDismiss={() => setAddCategoryMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setAddCategoryMenuVisible(true)}
                    style={{ marginBottom: 12 }}
                  >
                    {category}
                  </Button>
                }
              >
                {defaultCategories.map(cat => (
                  <Menu.Item
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setAddCategoryMenuVisible(false);
                    }}
                    title={cat}
                  />
                ))}
              </Menu>
              <Button
                mode="outlined"
                disabled
                style={{ marginBottom: 12 }}
              >
                {currency}
              </Button>
              <Button mode="contained" onPress={addTransaction} disabled={mustSetBudget || mustSelectCurrency}>
                Add Transaction
              </Button>
              <Button onPress={() => setShowForm(false)} style={{ marginTop: 8 }}>
                Cancel
              </Button>
            </Card>
          )}
          {!showForm && (
            <FAB
              style={{
                position: 'absolute',
                right: 16,
                bottom: 32,
                backgroundColor: '#4f8cff'
              }}
              icon="plus"
              onPress={() => setShowForm(true)}
              disabled={mustSetBudget || mustSelectCurrency}
            />
          )}
          <Portal>
            <Modal
              visible={!!selectedTransaction}
              onDismiss={() => setSelectedTransaction(null)}
              contentContainerStyle={{
                margin: 20,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 20,
              }}
            >
              {!editMode && selectedTransaction ? (
                <>
                  <Title>Transaction Details</Title>
                  <Paragraph>Description: {selectedTransaction.desc}</Paragraph>
                  <Paragraph>
                    Amount: {currency}
                    {selectedTransaction.amount.toLocaleString()}
                  </Paragraph>
                  <Paragraph>Category: {selectedTransaction.category}</Paragraph>
                  <Button mode="contained" onPress={() => setEditMode(true)} style={{ marginTop: 16 }}>
                    Edit
                  </Button>
                  <Button onPress={() => setSelectedTransaction(null)} style={{ marginTop: 8 }}>
                    Close
                  </Button>
                  <Button
                    mode="contained"
                    onPress={deleteTransaction}
                    style={{ marginTop: 8, backgroundColor: '#ff5252' }}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Title>Edit Transaction</Title>
                  <TextInput
                    label="Description"
                    value={editDesc}
                    onChangeText={setEditDesc}
                    style={{ marginBottom: 12 }}
                  />
                  <TextInput
                    label="Amount"
                    value={editAmount}
                    onChangeText={val => {
                      const raw = val.replace(/[^0-9.]/g, '');
                      setEditRawAmount(raw);
                      setEditAmount(formatCurrency(raw, currency));
                    }}
                    keyboardType="numeric"
                    style={{ marginBottom: 12 }}
                  />
                  <Menu
                    visible={editCategoryMenuVisible}
                    onDismiss={() => setEditCategoryMenuVisible(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setEditCategoryMenuVisible(true)}
                        style={{ marginBottom: 12 }}
                      >
                        {editCategory}
                      </Button>
                    }
                  >
                    {defaultCategories.map(cat => (
                      <Menu.Item
                        key={cat}
                        onPress={() => {
                          setEditCategory(cat);
                          setEditCategoryMenuVisible(false);
                        }}
                        title={cat}
                      />
                    ))}
                  </Menu>
                  <Button mode="contained" onPress={saveEdit}>
                    Save
                  </Button>
                  <Button onPress={() => setEditMode(false)} style={{ marginTop: 8 }}>
                    Cancel
                  </Button>
                </>
              )}
            </Modal>
          </Portal>
          <Portal>
            <Modal
              visible={mustSelectCurrency}
              dismissable={false}
              contentContainerStyle={{
                margin: 20,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 20,
                alignItems: 'center'
              }}
            >
              <Title>Select Your Currency</Title>
              {currencies.map(cur => (
                <Button
                  key={cur.symbol}
                  mode="outlined"
                  style={{ marginVertical: 8, minWidth: 150 }}
                  onPress={async () => {
                    setCurrency(cur.symbol);
                    await AsyncStorage.setItem('currency', cur.symbol);
                    setMustSelectCurrency(false);
                  }}
                >
                  {cur.label}
                </Button>
              ))}
            </Modal>
          </Portal>
          <Portal>
            <Modal
              visible={mustSetBudget}
              dismissable={false}
              contentContainerStyle={{
                margin: 20,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 20,
                alignItems: 'center'
              }}
            >
              <Title>Set Your Total Income</Title>
              <TextInput
                label="Total Income"
                value={userBudget}
                onChangeText={val => {
                  const raw = val.replace(/[^0-9.]/g, '');
                  setRawBudget(raw);
                  setUserBudget(formatCurrency(raw, currency));
                }}
                keyboardType="numeric"
                style={{ marginVertical: 12, minWidth: 150 }}
              />
              <Button
                mode="contained"
                disabled={!rawBudget}
                onPress={async () => {
                  await AsyncStorage.setItem('userBudget', rawBudget);
                  setMustSetBudget(false);
                }}
              >
                Save
              </Button>
            </Modal>
          </Portal>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}